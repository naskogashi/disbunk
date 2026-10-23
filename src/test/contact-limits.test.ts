// @vitest-environment node
import {PGlite} from '@electric-sql/pglite';
import {readFileSync} from 'node:fs';
import {expect,it} from 'vitest';
it('keeps contact throttles private and enforces three reservations per client bucket',async()=>{
  const db=new PGlite();
  try{
    await db.exec('create role anon;create role authenticated;create role service_role;');
    await db.exec(readFileSync('supabase/migrations/202610230004_contact_limits.sql','utf8'));
    for(let i=0;i<4;i++){
      const result=await db.query<{allowed:boolean}>("select public.reserve_contact_submission($1) as allowed",['a'.repeat(64)]);
      expect(result.rows[0].allowed).toBe(i<3);
    }
    const permissions=await db.query<{allowed:boolean}>("select has_function_privilege('anon','public.reserve_contact_submission(text)','execute') as allowed");
    expect(permissions.rows[0].allowed).toBe(false);
    const raw=await db.query<{enabled:boolean}>("select relrowsecurity as enabled from pg_class where relname='contact_submission_limits'");
    expect(raw.rows[0].enabled).toBe(true);
  }finally{await db.close();}
});
