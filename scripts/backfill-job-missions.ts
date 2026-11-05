import "dotenv/config";
import { Client } from "pg";
import { missionBackfillPatch } from "../lib/job-mission-backfill";
import { readFileSync } from "node:fs";

async function main() {
  const args=process.argv.slice(2);
  const apply=args.includes("--apply");
  const email=args.find(arg=>arg.startsWith("--email="))?.slice(8);
  const snapshot=args.find(arg=>arg.startsWith("--snapshot="))?.slice(11);
  if (snapshot && apply) throw Error("Snapshot mode is read-only");
  if (!snapshot && !email) throw Error("Supply --email=account or --snapshot=private-file.json");
  const db = snapshot ? null : new Client({connectionString:process.env.DATABASE_URL});
  try {
    await db?.connect();
    if (apply) await db!.query("BEGIN");
    const rows = snapshot ? JSON.parse(readFileSync(snapshot,"utf8")).jobs : (await db!.query(`SELECT j.* FROM "JobApplication" j JOIN "User" u ON u.id=j."userId" WHERE lower(u.email)=lower($1) ORDER BY j.id ${apply ? 'FOR UPDATE OF j' : ''}`,[email])).rows;
    const before = rows.filter((row: {submissionConfirmed:boolean})=>row.submissionConfirmed).length;
    let changed=0;
    for (const row of rows) {
      const patch=missionBackfillPatch(row);
      if (!patch) continue;
      if (apply) {
        const updated=(await db!.query('UPDATE "JobApplication" SET "trackerDetails"=$1::jsonb,"updatedAt"=NOW() WHERE id=$2 RETURNING *',[JSON.stringify({...row.trackerDetails,...patch}),row.id])).rows[0];
        for (const key of Object.keys(row)) {
          if (key==='trackerDetails'||key==='updatedAt') continue;
          if (JSON.stringify(row[key])!==JSON.stringify(updated[key])) throw Error(`Original ${key} changed; rolling back`);
        }
        for (const [key,value] of Object.entries(row.trackerDetails ?? {})) if (!(key in patch) && JSON.stringify(updated.trackerDetails[key])!==JSON.stringify(value)) throw Error("Existing details changed; rolling back");
      }
      changed++;
      console.log(JSON.stringify({company:row.company,title:row.title,...patch}));
    }
    if(apply) {
      const after=+(await db!.query('SELECT count(*) AS n FROM "JobApplication" j JOIN "User" u ON u.id=j."userId" WHERE lower(u.email)=lower($1) AND j."submissionConfirmed"',[email])).rows[0].n;
      if(before!==after) throw Error("Confirmed totals changed; rolling back");
      await db!.query("COMMIT");
    }
    console.log(JSON.stringify({mode:apply?"applied":"dry-run",records:rows.length,classified:changed,confirmed:before}));
  } catch(error) { if(apply) await db?.query("ROLLBACK"); throw error; }
  finally {await db?.end();}
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
