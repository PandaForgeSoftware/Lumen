import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, mkdir } from "node:fs/promises";
import { all, event } from "./store.mjs";
const run = promisify(execFile);
// Background uploads must never open a login prompt or depend on a chat session.
const exec = (file, args, options = {}) => run(file, args, {
  timeout: 60000,
  ...options,
  env: { ...process.env, GIT_TERMINAL_PROMPT: "0", GCM_INTERACTIVE: "Never" },
});
let pending;
export function syncWorld() {
  if (!pending) pending = performSync().finally(() => (pending = null));
  return pending;
}
export function publicSnapshot() {
  // Only world designs are published. Conversations, memories, research excerpts,
  // personal requests, runtime logs and credentials never enter this snapshot.
  const objects = all("objects")
    .filter((o) => o.publish || o.author === "setup")
    .map(({ id, name, purpose, x, z, category, color, parts, author }) => ({
      id,
      name,
      purpose,
      x,
      z,
      category,
      color,
      parts,
      author,
    }));
  const publicIds = new Set(objects.map((o) => o.id));
  const projects = all("projects")
    .filter((p) => p.publish === true || publicIds.has(p.objectId))
    .map(({ id, title, description, status, objectId, nextStep }) => ({
      id,
      title,
      description,
      status,
      objectId,
      nextStep,
    }));
  const activity = all("tasks")
    .filter((t) => t.source === "autonomy")
    .slice(-20)
    .map(({ id, status, updatedAt }) => ({ id, status, updatedAt }));
  return { objects, projects, activity };
}
async function performSync() {
  const remote = (
    await exec("git", ["remote", "get-url", "origin"], { windowsHide: true })
  ).stdout.trim();
  if (remote !== "https://github.com/PandaForgeSoftware/Lumen.git")
    throw new Error("The approved Lumen GitHub remote is not configured.");
  await mkdir("world", { recursive: true });
  const snapshot = publicSnapshot();
  await writeFile(
    "world/snapshot.json",
    JSON.stringify(snapshot, null, 2) + "\n",
  );
  await writeFile("world/PROJECTS.md", projectMarkdown(snapshot.projects));
  await exec("git", ["add", "--", "world/snapshot.json", "world/PROJECTS.md"], {
    windowsHide: true,
  });
  const diff = await exec("git", ["diff", "--cached", "--name-only"], {
    windowsHide: true,
  });
  if (
    diff.stdout
      .trim()
      .split("\n")
      .some((x) => x && !["world/snapshot.json", "world/PROJECTS.md"].includes(x))
  )
    throw new Error(
      "Other files are staged. Commit them separately before world sync.",
    );
  if (diff.stdout.trim())
    await exec("git", ["commit", "-m", "Save Lumen world designs"], {
      windowsHide: true,
    });
  await exec("git", ["push", "origin", "HEAD:main"], {
    windowsHide: true,
    timeout: 60000,
  });
  const local = (
    await exec("git", ["rev-parse", "HEAD"], { windowsHide: true })
  ).stdout.trim();
  const remoteHead = (
    await exec("git", ["ls-remote", "origin", "refs/heads/main"], {
      windowsHide: true,
      timeout: 30000,
    })
  ).stdout.split(/\s/)[0];
  if (local !== remoteHead)
    throw new Error("Push completed but remote verification did not match.");
  event("GitHub snapshot uploaded", local, "sync");
  return { synced: true, commit: local };
}
export function projectMarkdown(projects) {
  const clean = s => String(s || "").replace(/[\r\n|<>]/g, " ");
  return "# Lumen’s projects\n\nPublic creative plans and saved creations. Private owner requests are excluded.\n\n" +
    ["planned", "working", "blocked", "complete"].map(status =>
      "## " + status[0].toUpperCase() + status.slice(1) + "\n\n" +
      (projects.filter(p => p.status === status).map(p =>
        "- **" + clean(p.title) + "** — " + clean(p.description) +
        (p.nextStep ? " Next: " + clean(p.nextStep) : "")).join("\n") || "None yet.")
    ).join("\n\n") + "\n";
}
