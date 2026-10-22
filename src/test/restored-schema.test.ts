// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, readdirSync } from "node:fs";
import { expect, it } from "vitest";

it("upgrades the restored text-based schema without losing profiles or breaking upload triggers", async () => {
  const db = new PGlite();
  try {
    await db.exec(readFileSync("src/test/fixtures/restored-legacy-schema.sql", "utf8"));
    for (const file of readdirSync("supabase/migrations").filter(file => file.endsWith(".sql")).sort()) {
      await db.exec(readFileSync(`supabase/migrations/${file}`, "utf8"));
    }
    expect((await db.query("select * from profiles")).rows).toHaveLength(3);
    expect((await db.query("select * from user_roles")).rows).toHaveLength(3);
    await db.exec("grant select,insert,update,delete on all tables in schema public,storage to authenticated; set role authenticated");
    await db.query("select set_config('request.jwt.claim.sub','00000000-0000-4000-8000-000000000001',false)");
    const profile = await db.query<{profile:{status:string}}>("select get_my_profile_and_roles() as profile");
    expect(profile.rows[0].profile.status).toBe("approved");
    await db.exec("insert into evidence(claim_id,title,uploaded_by,sha256) values('00000000-0000-4000-8000-000000000010','Upload test','00000000-0000-4000-8000-000000000001',repeat('a',64))");
    await expect(db.exec("update profiles set role='admin' where user_id='00000000-0000-4000-8000-000000000001'")).rejects.toThrow(/managed role/);
    const team = await db.query<{id:string}>("select create_team_with_lead('Restored team') as id");
    expect((await db.query("select * from get_team_roster($1)",[team.rows[0].id])).rows).toHaveLength(1);
  } finally { await db.close(); }
}, 30000);
