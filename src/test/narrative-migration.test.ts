// @vitest-environment node
import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import { expect, it } from 'vitest';

it('restricts narrative reviews to approved admins and creates campaigns atomically', async () => {
  const db = new PGlite();
  const analyst='00000000-0000-4000-8000-000000000001', admin='00000000-0000-4000-8000-000000000002';
  try {
    await db.exec(readFileSync('src/test/fixtures/restored-legacy-schema.sql','utf8'));
    for (const file of readdirSync('supabase/migrations').filter(f=>f.endsWith('.sql')).sort()) await db.exec(readFileSync(`supabase/migrations/${file}`,'utf8'));
    await db.exec(`update user_roles set role='admin' where user_id='${admin}';`);
    const run=(await db.query<{id:string}>("insert into cluster_runs(model) values('test') returning id")).rows[0].id;
    const suggestion=(await db.query<{id:string}>("insert into narrative_suggestions(run_id,fingerprint,title) values($1,'test-group','A narrative group') returning id",[run])).rows[0].id;
    for(let index=0;index<5;index++) {
      const claim=(await db.query<{id:string}>("insert into claims(title,created_by) values($1,$2) returning id",[`Claim ${index}`,analyst])).rows[0].id;
      await db.query("insert into narrative_suggestion_claims(suggestion_id,claim_id,source_hash,strength,source_updated_at) select $1,$2,'hash',0.8,updated_at from claims where id=$2",[suggestion,claim]);
    }
    await db.query("update narrative_suggestions set created_at=now() where id=$1",[suggestion]);
    const asUser=async(id:string)=>{await db.exec('reset role');await db.query("select set_config('request.jwt.claim.sub',$1,false)",[id]);await db.exec('set role authenticated');};
    await asUser(analyst);
    expect((await db.query('select * from narrative_suggestions')).rows).toHaveLength(0);
    await expect(db.query("select review_narrative_suggestion($1,'accepted','Unauthorized')",[suggestion])).rejects.toThrow(/admin access/);
    await asUser(admin);
    expect((await db.query('select * from narrative_suggestions')).rows).toHaveLength(1);
    await expect(db.query("update narrative_suggestions set title='Bypass'")).rejects.toThrow(/permission denied/);
    const result=await db.query<{id:string}>("select review_narrative_suggestion($1,'accepted','Reviewed campaign') as id",[suggestion]);
    expect(result.rows[0].id).toBeTruthy();
    await expect(db.query("select review_narrative_suggestion($1,'accepted','Duplicate')",[suggestion])).rejects.toThrow(/no longer pending/);
    await db.exec('reset role');
    expect((await db.query('select * from campaign_claims')).rows).toHaveLength(5);
    expect((await db.query("select * from audit_logs where action='narrative_accepted'")).rows).toHaveLength(1);
    const stale=(await db.query<{id:string}>("insert into narrative_suggestions(run_id,fingerprint,title) values($1,'stale-group','Stale group') returning id",[run])).rows[0].id;
    await db.query("insert into narrative_suggestion_claims(suggestion_id,claim_id,source_hash,strength,source_updated_at) select $1,claim_id,source_hash,strength,source_updated_at from narrative_suggestion_claims where suggestion_id=$2",[stale,suggestion]);
    await db.query("update claims set updated_at=now()+interval '1 second' where id in(select claim_id from narrative_suggestion_claims where suggestion_id=$1)",[stale]);
    await asUser(admin);
    await expect(db.query("select review_narrative_suggestion($1,'accepted','Stale campaign')",[stale])).rejects.toThrow(/Claims changed/);
    await db.query("select review_narrative_suggestion($1,'rejected',null)",[stale]);
    await db.exec('reset role');
    expect((await db.query("select status from narrative_suggestions where id=$1",[stale])).rows).toEqual([{status:'rejected'}]);
    await db.exec('set role disbunk_cluster_worker');
    expect((await db.query('select title from claims')).rows.length).toBeGreaterThan(0);
    await expect(db.query("update claims set title='Worker cannot edit claims'")).rejects.toThrow(/permission denied/);
    await expect(db.query('select * from profiles')).rejects.toThrow(/permission denied/);
  } finally {await db.close();}
},30000);
