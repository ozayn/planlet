/** Isolated PostgreSQL migration + service checks. Requires a localhost admin URL.
 * Creates and removes only a uniquely named disposable database; never uses application records.
 * Run: PLANLET_TEST_ADMIN_URL=... npx tsx scripts/test-job-tracker-db.ts
 */
import { Client } from "pg";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import assert from "node:assert/strict";

async function main() {
  const adminUrl = process.env.PLANLET_TEST_ADMIN_URL;
  if (!adminUrl)
    throw new Error(
      "Set PLANLET_TEST_ADMIN_URL to a localhost PostgreSQL connection.",
    );
  const url = new URL(adminUrl);
  if (!["localhost", "127.0.0.1", "[::1]"].includes(url.hostname))
    throw new Error("Tests require a localhost database.");
  const database = `planlet_job_tracker_test_${Date.now()}`;
  const admin = new Client({ connectionString: adminUrl });
  await admin.connect();
  let db: Client | undefined;
  let disconnect: (() => Promise<void>) | undefined;
  try {
    await admin.query(`CREATE DATABASE "${database}"`);
    url.pathname = `/${database}`;
    process.env.DATABASE_URL = url.toString();
    db = new Client({ connectionString: process.env.DATABASE_URL });
    await db.connect();
    // Bootstrap only the historical job-tracker migrations. Other application
    // migrations depend on pre-existing production baseline objects.
    await db.query(
      `CREATE TABLE "User" (id TEXT PRIMARY KEY, email TEXT, role TEXT NOT NULL DEFAULT 'USER', timezone TEXT)`,
    );
    for (const migration of [
      "20260622215538_add_job_tracker",
      "20260625140000_add_job_normalized_url",
      "20260625150000_add_job_application_normalized_url",
    ]) {
      await db.query(
        await readFile(
          resolve("prisma/migrations", migration, "migration.sql"),
          "utf8",
        ),
      );
    }
    await db.query(
      `INSERT INTO "User" (id, email, "canUseJobTrackerFeatures", timezone) VALUES ('tracker-test-user','tracker-test@example.invalid',true,'America/New_York'),('other-user','other@example.invalid',true,'Asia/Tokyo')`,
    );
    const statuses = [
      "SAVED",
      "APPLIED",
      "INTERVIEWING",
      "REJECTED",
      "OFFER",
      "WITHDRAWN",
      "ARCHIVED",
    ];
    for (const [i, status] of statuses.entries())
      await db.query(
        `INSERT INTO "JobApplication" (id,"userId",title,company,url,"appliedDate",status,notes,salary,"createdAt","updatedAt") VALUES ($1,'tracker-test-user',$2,'Legacy Co',$3,'2026-06-25',$4,$5,'Unknown', '2026-06-24 01:23:00', '2026-06-25 01:23:00')`,
        [
          `legacy-${i}`,
          `Legacy role ${i}`,
          `https://example.com/legacy/${i}?tracking=keep`,
          status,
          `Original notes ${i}\nsecond line`,
        ],
      );
    const before = (
      await db.query(`SELECT * FROM "JobApplication" ORDER BY id`)
    ).rows;
    await db.query(
      await readFile(
        resolve(
          "prisma/migrations/20261104120000_job_tracker_workflow/migration.sql",
        ),
        "utf8",
      ),
    );
    const after = (await db.query(`SELECT * FROM "JobApplication" ORDER BY id`))
      .rows;
    for (let i = 0; i < before.length; i++)
      for (const key of Object.keys(before[i]))
        assert.deepEqual(
          after[i][key],
          before[i][key],
          `Migration preserved ${key}`,
        );
    assert.ok(
      after.every(
        (row) => !row.submissionConfirmed && row.submittedDate === null,
      ),
    );
    console.log(
      "PASS: migration preserves every legacy status, date, URL, note and field; does not infer submissions",
    );
    const api = await import("../lib/job-applications");
    const { prisma } = await import("../lib/prisma");
    disconnect = async () => {
      await prisma.$disconnect();
      const globalPool = (
        globalThis as unknown as { pgPool?: { end: () => Promise<void> } }
      ).pgPool;
      if (globalPool) await globalPool.end();
    };
    const { emptyTrackerDetails } = await import("../lib/job-tracker-details");
    const user = "tracker-test-user";
    const draft = await api.createJobApplication(user, {
      title: "Database test",
      company: "Test Co",
      notes: "Keep these notes",
      url: "https://example.com/job/123?utm_source=keep",
    });
    assert.equal(draft.appliedDate, null);
    assert.equal(draft.submissionConfirmed, false);
    assert.equal(draft.trackerDetails.salaryMin, "");
    const failed = await api.updateJobApplication(user, draft.id, {
      status: "SUBMISSION_FAILED",
      trackerDetails: {
        ...emptyTrackerDetails(),
        blockerType: "Technical issue",
        blockerNote: "Upload failed",
      },
    });
    assert.equal(failed.notes, draft.notes);
    assert.equal(failed.url, draft.url);
    assert.equal(failed.submissionConfirmed, false);
    await assert.rejects(
      () =>
        api.updateJobApplication(user, draft.id, { confirmSubmission: true }),
      /Resolve the blocker/,
    );
    const blocked = await api.updateJobApplication(user, draft.id, {
      status: "NEEDS_INPUT",
      trackerDetails: {
        ...emptyTrackerDetails(),
        blockerType: "Missing answer",
        blockerNote: "Work authorization answer",
      },
    });
    assert.equal(blocked.submissionConfirmed, false);
    await api.updateJobApplication(user, draft.id, {
      status: "READY_TO_SUBMIT",
      trackerDetails: {
        ...emptyTrackerDetails(),
        qualificationGaps: "AWS certificate (preferred)",
        resumeVersion: "resume-v1",
        resumeLink: "https://example.com/resume-v1.pdf",
        coverLetterVersion: "letter-v1",
      },
    });
    const submitted = await api.updateJobApplication(user, draft.id, {
      confirmSubmission: true,
      submissionDate: "2026-06-26",
    });
    assert.equal(submitted.status, "APPLIED");
    assert.equal(
      submitted.trackerDetails.qualificationGaps,
      "AWS certificate (preferred)",
    );
    assert.equal(submitted.submittedDate, "2026-06-26");
    const snapshot = submitted.trackerHistory.find(
      (e) => e.kind === "confirmed",
    )!;
    assert.equal(snapshot.materials?.resumeVersion, "resume-v1");
    const edited = await api.updateJobApplication(user, draft.id, {
      status: "REJECTED",
      confirmSubmission: true,
      submissionDate: "2026-06-27",
      trackerDetails: {
        ...emptyTrackerDetails(),
        resumeVersion: "resume-v2",
        materialsNeedReview: true,
      },
    });
    assert.equal(edited.submittedDate, "2026-06-26");
    assert.equal(
      edited.trackerHistory.filter((e) => e.kind === "confirmed").length,
      1,
    );
    assert.deepEqual(
      edited.trackerHistory.find((e) => e.kind === "confirmed"),
      snapshot,
    );
    const archived = await api.archiveJobApplication(user, draft.id);
    assert.equal(archived.trackerHistory.at(-1)?.to, "ARCHIVED");
    assert.equal(archived.submissionConfirmed, true);
    console.log(
      "PASS: blocked/failed/confirmed workflow, partial-update preservation, immutable submitted versions, and archive history",
    );
    await assert.rejects(
      () => api.createJobApplication(user, { title: "Repost", url: draft.url }),
      api.DuplicateJobApplicationError,
    );
    const repost = await api.createJobApplication(user, {
      title: "Repost",
      url: draft.url,
      allowDuplicate: true,
    });
    assert.notEqual(repost.id, draft.id);
    const updatedRepost = await api.updateJobApplication(user, repost.id, {
      notes: "Separate repost, updated without repeated duplicate warning",
    });
    assert.equal(
      updatedRepost.notes,
      "Separate repost, updated without repeated duplicate warning",
    );
    await api.createJobApplication(user, {
      title: "ID test",
      company: "Identifier Co",
      trackerDetails: { ...emptyTrackerDetails(), employerJobId: "AB123" },
    });
    await assert.rejects(
      () =>
        api.createJobApplication(user, {
          title: "Different title",
          company: "Identifier Co",
          trackerDetails: { ...emptyTrackerDetails(), employerJobId: "AB123" },
        }),
      /employer\/job ID/,
    );
    await assert.rejects(
      () =>
        api.createJobApplication(user, {
          title: "ID test",
          company: "Identifier Co",
        }),
      /company\/title/,
    );
    assert.equal(await api.getJobApplication("other-user", draft.id), null);
    await assert.rejects(
      () =>
        api.updateJobApplication("other-user", draft.id, {
          notes: "overwrite",
        }),
      /not found/,
    );
    const legacy = await api.updateJobApplication(user, "legacy-1", {
      status: "WITHDRAWN",
    });
    assert.equal(legacy.appliedDate, "2026-06-25");
    assert.equal(legacy.notes, "Original notes 1\nsecond line");
    assert.equal(legacy.url, "https://example.com/legacy/1?tracking=keep");
    assert.equal(legacy.submissionConfirmed, false);
    const longNotes = "  Original notes\n" + "x".repeat(5000);
    await db.query(
      `UPDATE "JobApplication" SET notes=$1,url='legacy-url',"appliedDate"='legacy-date' WHERE id='legacy-0'`,
      [longNotes],
    );
    const unchanged = await api.updateJobApplication(user, "legacy-0", {
      status: "PREPARING",
      notes: longNotes,
      url: "legacy-url",
      appliedDate: "legacy-date",
    });
    assert.equal(unchanged.notes, longNotes);
    assert.equal(unchanged.url, "legacy-url");
    assert.equal(unchanged.appliedDate, "legacy-date");
    const baselineCount = unchanged.trackerHistory.length;
    await Promise.all([
      api.updateJobApplication(user, "legacy-0", { status: "NEEDS_INPUT" }),
      api.updateJobApplication(user, "legacy-0", { status: "READY_TO_SUBMIT" }),
    ]);
    const concurrent = await api.getJobApplication(user, "legacy-0");
    assert.equal(concurrent?.trackerHistory.length, baselineCount + 2);
    console.log(
      "PASS: duplicate warnings, explicit repost override, ownership checks, and unchanged legacy notes/dates/URLs",
    );
  } finally {
    if (disconnect) await disconnect();
    if (db) await db.end();
    await admin.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`);
    await admin.end();
  }
}
main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
