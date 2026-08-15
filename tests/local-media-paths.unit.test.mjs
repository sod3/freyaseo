import assert from "node:assert/strict";
import path from "node:path";
import test from "node:test";
import {
  fallbackRelativeLocalMediaKey,
  localMediaPathCandidates,
  portablePathBasename,
  relativeUploadKeyFromUrl,
} from "../src/lib/admin/local-media-paths.ts";

test("extracts a portable filename from paths created on either OS", () => {
  assert.equal(portablePathBasename(String.raw`C:\old-host\uploads\hero.webp`), "hero.webp");
  assert.equal(portablePathBasename("/var/www/uploads/hero.webp"), "hero.webp");
});

test("resolves a stale Windows absolute path only inside the current upload root", () => {
  const root = path.resolve(".tmp", "managed-media-test");
  const candidates = localMediaPathCandidates(root, {
    storageKey: String.raw`C:\old-host\uploads\hero.webp`,
    fileName: "hero.webp",
    url: "/uploads/hero.webp",
  });

  assert.deepEqual(candidates.map((candidate) => candidate.relativeStorageKey), ["hero.webp"]);
  assert.equal(candidates[0].target, path.join(root, "hero.webp"));
});

test("keeps a valid current absolute path and nested relative key", () => {
  const root = path.resolve(".tmp", "managed-media-test");
  const target = path.join(root, "2026", "hero.webp");
  const candidates = localMediaPathCandidates(root, { storageKey: target });

  assert.equal(candidates[0].target, target);
  assert.equal(candidates[0].relativeStorageKey, "2026/hero.webp");
});

test("rejects traversal, encoded separators, external URLs, and query strings", () => {
  assert.equal(relativeUploadKeyFromUrl("/uploads/../secret.txt"), null);
  assert.equal(relativeUploadKeyFromUrl("/uploads/%2e%2e/secret.txt"), null);
  assert.equal(relativeUploadKeyFromUrl("/uploads/folder%2fsecret.txt"), null);
  assert.equal(relativeUploadKeyFromUrl("https://example.com/uploads/hero.webp"), null);
  assert.equal(relativeUploadKeyFromUrl("/uploads/hero.webp?download=1"), null);
});

test("uses only a safe portable restore key for a legacy record", () => {
  assert.equal(
    fallbackRelativeLocalMediaKey({ storageKey: String.raw`C:\old-host\uploads\hero.webp` }),
    "hero.webp",
  );
  assert.equal(fallbackRelativeLocalMediaKey({ storageKey: ".." }), "");
});
