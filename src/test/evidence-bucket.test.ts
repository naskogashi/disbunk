// @vitest-environment node
import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("restores a missing evidence bucket privately and preserves existing bucket settings", async () => {
  const db = new PGlite();
  try {
    await db.exec("create schema storage; create table storage.buckets(id text primary key, name text, public boolean, file_size_limit bigint)");
    const migration = readFileSync("supabase/migrations/202610220004_restore_evidence_bucket.sql", "utf8");
    await db.exec(migration);
    expect((await db.query("select name,public from storage.buckets where id='evidence'")).rows).toEqual([{name:"evidence",public:false}]);
    await db.exec("update storage.buckets set public=true,file_size_limit=52428800 where id='evidence'");
    await db.exec(migration);
    expect((await db.query("select public,file_size_limit::text from storage.buckets where id='evidence'")).rows).toEqual([{public:false,file_size_limit:"52428800"}]);
  } finally { await db.close(); }
});
