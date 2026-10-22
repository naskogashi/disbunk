// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { expect, it } from "vitest";

it("limits team edits, audits changes, validates C5 intent and hides integrations from nonadmins", async () => {
  const db = new PGlite();
  const analyst = "00000000-0000-4000-8000-000000000001", admin = "00000000-0000-4000-8000-000000000002";
  try {
    await db.exec(readFileSync("src/test/fixtures/restored-legacy-schema.sql", "utf8"));
    for (const file of readdirSync("supabase/migrations").filter(file => file.endsWith(".sql")).sort()) await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
    await db.exec(`update user_roles set role='admin' where user_id='${admin}'; grant select,insert,update,delete on all tables in schema public to authenticated; create policy "Legacy integration read" on integration_connections for select to authenticated using(true);`);
    await db.exec("insert into integration_connections default values");
    const asUser = async (id: string) => { await db.exec("reset role"); await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]); await db.exec("set role authenticated"); };
    await asUser(admin);
    expect((await db.query("select * from integration_connections")).rows).toHaveLength(1);
    const team = (await db.query<{id:string}>("select create_team_with_lead('Original') as id")).rows[0].id;
    await db.query("select update_team_details($1,'Renamed','Description')", [team]);
    expect((await db.query<{name:string}>("select name from teams where id=$1", [team])).rows[0].name).toBe("Renamed");
    await expect(db.query("select update_team_details($1,'  ','')", [team])).rejects.toThrow(/team name/);
    await asUser(analyst);
    expect((await db.query("select * from integration_connections")).rows).toHaveLength(0);
    await expect(db.query("select update_team_details($1,'Unauthorized','')", [team])).rejects.toThrow(/access required/);
    const ownTeam = (await db.query<{id:string}>("select create_team_with_lead('Own team') as id")).rows[0].id;
    await db.query("select update_team_details($1,'Lead renamed','')", [ownTeam]);
    await db.exec("reset role");
    expect((await db.query("select * from audit_logs where action='team_details_updated'")).rows).toHaveLength(2);
    await expect(db.exec(`update claims set c5_assessment='{"classification":"disinformation"}'`)).rejects.toThrow(/claims_c5_intent/);
    await db.exec(`update claims set c5_assessment='{"classification":"disinformation","intentEvidence":"Documented source admission"}'`);
    const policy = (await db.query<{qual:string}>("select qual from pg_policies where policyname='Admin integration access only'")).rows[0];
    expect(policy.qual).toContain("admin");
  } finally { await db.close(); }
}, 30000);
