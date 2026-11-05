import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
const directory = mkdtempSync(path.join(os.tmpdir(), "lumen-test-"));
process.env.LUMEN_DATA_DIR = directory;
const { get, put, all, settings } = await import("../lib/store.mjs");
const { build, remember, research } = await import("../lib/actions.mjs");
const { goToPlace } = await import("../lib/embodiment.mjs");
const { publicSnapshot } = await import("../lib/github.mjs");
const design = {
  id: "test-lantern",
  name: "Lantern",
  purpose: "A guide along the path.",
  x: 20,
  z: 20,
  category: "sculpture",
  color: "#aabbcc",
  parts: [
    { shape: "box", x: 0, y: 1, z: 0, sx: 1, sy: 2, sz: 1, color: "#aabbcc" },
  ],
};
test("visits persist and existing research is reused without another book", async () => {
  goToPlace("library");
  assert.equal(get("runtime", "embodiment").x, -9);
  assert.throws(() => goToPlace("unknown"), /Unknown place/);
  put("books", { id: "cached-topic", title: "Cached topic", body: "Saved research" });
  const count = all("books").length;
  const book = await research({ topic: "cached TOPIC" });
  assert.equal(book.id, "cached-topic");
  assert.equal(all("books").length, count);
  assert.equal(get("runtime", "embodiment").bookId, book.id);
});
test("new creations cannot occupy the library interior", () => {
  assert.throws(() => build({ ...design, id: "blocked-library", x: -9, z: -7 }), /occupied building/);
  assert.equal(get("objects", "blocked-library"), null);
});
test("creation is stored, appears in projects, and survives a new process", () => {
  const r = build(design);
  assert.equal(r.saved, true);
  assert.equal(get("projects", design.id).status, "complete");
  const output = execFileSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      "import {get} from './lib/store.mjs';console.log(get('objects','test-lantern').name)",
    ],
    { cwd: process.cwd(), env: process.env, encoding: "utf8" },
  );
  assert.equal(output.trim(), "Lantern");
});
test("pause blocks world mutations without changing objects", () => {
  put("settings", { ...settings(), autonomy: false });
  assert.throws(() => build({ ...design, name: "Blocked" }), /paused/);
  assert.equal(get("objects", design.id).name, "Lantern");
  put("settings", { ...settings(), autonomy: true });
});
test("invalid, invisible and overlapping designs cannot create completed projects", () => {
  assert.throws(() => build({ ...design, id: "invalid", x: 999 }));
  assert.throws(() => build({ ...design, id: "invisible", parts: [] }));
  assert.throws(() => build({ ...design, id: "overlap" }), /Too close/);
  for (const id of ["invalid", "invisible", "overlap"])
    assert.equal(get("projects", id), null);
});
test("updates use a stable identity and preferences survive independent reads", () => {
  build({ ...design, name: "Improved lantern" });
  assert.equal(all("objects").filter((o) => o.id === design.id).length, 1);
  remember({ id: "home-alias", text: "At home means Home PC." });
  assert.equal(get("memory", "home-alias").text, "At home means Home PC.");
});
test("owner tasks stay out of automatic public snapshots", () => {
  assert.equal(get("objects", design.id).publish, false);
  put("tasks", { id: "creative-test", source: "autonomy" });
  put("runtime", { id: "agent", taskId: "creative-test" });
  build({ ...design, id: "public-design", x: 30 });
  assert.equal(get("objects", "public-design").publish, true);
  put("messages", { id: "private-chat", text: "PRIVATE_SENTINEL" });
  put("books", { id: "private-book", body: "PRIVATE_SENTINEL" });
  remember({ id: "private-memory", text: "PRIVATE_SENTINEL" });
  const snapshot = publicSnapshot();
  assert(!snapshot.objects.some((o) => o.id === design.id));
  assert(snapshot.objects.some((o) => o.id === "public-design"));
  assert(!JSON.stringify(snapshot).includes("PRIVATE_SENTINEL"));
});
