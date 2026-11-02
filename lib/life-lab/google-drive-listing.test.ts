import assert from "node:assert/strict";
import { generateKeyPairSync } from "node:crypto";
import { test } from "node:test";
import { listMarkdownFilesRecursive } from "./google-drive";

test("walks sibling folders concurrently while preserving exclusions and depth limits", async (t) => {
  const { privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  const folder = (id: string, name = id) => ({ id, name, mimeType: "application/vnd.google-apps.folder" });
  const listings: Record<string, unknown[]> = {
    root: [folder("a"), folder("b"), folder("working", "_working")],
    a: [{ id: "note-a", name: "a.md" }, folder("deep")],
    b: [{ id: "note-b", name: "b.md" }, { id: "ignored", name: "image.png" }],
  };
  const visited: string[] = [];
  let active = 0;
  let peak = 0;
  t.mock.method(globalThis, "fetch", async (input: string | URL | Request) => {
    const url = new URL(String(input));
    if (url.hostname === "oauth2.googleapis.com") return Response.json({ access_token: "test", expires_in: 3600 });
    const id = url.searchParams.get("q")!.match(/^'([^']+)'/)![1];
    visited.push(id);
    active++;
    peak = Math.max(peak, active);
    await new Promise((resolve) => setTimeout(resolve, 100));
    active--;
    return Response.json({ files: listings[id] ?? [] });
  });
  const result = await listMarkdownFilesRecursive({
    clientEmail: "test@example.invalid", rootFolderId: "root",
    privateKey: privateKey.export({ type: "pkcs8", format: "pem" }).toString(),
  }, "root", { maxDepth: 1, shouldSkipFolder: (name) => name === "_working" });
  assert.deepEqual(result.entries.map((entry) => entry.relativePath).sort(), ["a/a.md", "b/b.md"]);
  assert.deepEqual(visited.sort(), ["a", "b", "root"]);
  assert.ok(peak > 1, "sibling listings should overlap");
  assert.equal(result.stats.maxDepthUsed, 1);
  assert.equal(result.stats.fileCount, 2);
});
