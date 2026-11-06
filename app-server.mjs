// Keep this separate from Eve/Nitro's reserved server.mjs entry point.
import http from "node:http";
import { setActivity } from "./lib/embodiment.mjs";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Client } from "eve/client";
import { state, settings, get, put, all, event } from "./lib/store.mjs";
const root = path.dirname(fileURLToPath(import.meta.url));
const port = Number(process.env.PORT || 4317),
  agentPort = 4318;
const client = new Client({ baseUrl: `http://127.0.0.1:${agentPort}` });
let child = null,
  lastRuntimeStart = 0,
  lastSyncAttempt = 0,
  busy = false,
  currentSession = null,
  nextCreative = Date.now() + 60000;
const logs = path.join(root, "data");
await mkdir(logs, { recursive: true });
for (const task of all("tasks").filter((t) => t.status === "working"))
  put("tasks", {
    ...task,
    status: "interrupted",
    error:
      "Lumen restarted. Review the world before requesting this task again.",
  });
put("runtime", {
  id: "agent",
  status: "starting",
  model: "lumen-local",
  detail: "Connecting to the local model runtime.",
});
async function ready() {
  try {
    await client.health();
    return true;
  } catch {
    return false;
  }
}
async function startRuntime() {
  if (await ready()) return;
  if (child && child.exitCode === null && !child.killed) return;
  if (Date.now() - lastRuntimeStart < 60000) return;
  lastRuntimeStart = Date.now();
  child = spawn(
    process.execPath,
    [
      path.join(root, "node_modules/eve/bin/eve.js"),
      "dev",
      "--no-ui",
      "--no-default-extensions",
      "--resume",
      "--host",
      "127.0.0.1",
      "--port",
      String(agentPort),
    ],
    {
      cwd: root,
      windowsHide: true,
      env: {
        ...process.env,
        LUMEN_DATA_DIR: path.join(root, "data"),
        EVE_TELEMETRY_DISABLED: "1",
      },
      stdio: ["ignore", "pipe", "pipe"],
    },
  );
  const { createWriteStream } = await import("node:fs");
  const log = createWriteStream(path.join(logs, "runtime.log"), { flags: "a" });
  child.stdout.pipe(log);
  child.stderr.pipe(log);
  child.on("exit", (code) => {
    put("runtime", {
      id: "agent",
      status: "offline",
      detail:
        "Agent process stopped (" + code + "). Restart Lumen to reconnect.",
    });
  });
}
function enqueue(message, source = "owner") {
  if (
    all("tasks").filter((t) => ["queued", "working"].includes(t.status))
      .length >= 12
  )
    throw new Error("There are already 12 tasks waiting.");
  const task = put("tasks", {
    id: crypto.randomUUID(),
    message,
    source,
    status: "queued",
  });
  if (source === "owner")
    put("messages", { id: crypto.randomUUID(), role: "user", text: message });
  return task;
}
async function work() {
  if (busy) return;
  busy = true;
  if (!(await ready())) {
    await startRuntime();
    put("runtime", {
      id: "agent",
      status: "starting",
      detail:
        "Waiting for the local AI runtime. Check data/runtime.log if this persists.",
    });
    busy = false;
    return;
  }
  const queuedTasks = all("tasks").filter(t => t.status === "queued");
  let task = queuedTasks.find(t => t.source === "owner") || queuedTasks.find(
    (t) =>
      t.status === "queued" && (t.source === "owner" || settings().autonomy),
  );
  if (!task && settings().autonomy && Date.now() >= nextCreative) {
    task = enqueue(
      "It is your independent work time. Read your world, memory, projects and helpers. Use plan_project to record a useful idea or update an existing project with its next step. Prefer unfinished projects. You may create_helper and consult_helper for design or review. Then perform one concrete step with build_building or build_object, or record honestly why blocked. Use the same project id when building so it becomes complete. Choose varied useful rooms, gardens and places to visit. Do not repeat old sculptures. Work within available tools. /no_think",
      "autonomy",
    );
  }
  if (!task) {
    put("runtime", {
      id: "agent",
      status: settings().autonomy ? "idle" : "paused",
      detail: settings().autonomy
        ? "Ready. Next creative session " +
          new Date(nextCreative).toLocaleTimeString()
        : "Independent creation is paused.",
      model: "lumen-local",
    });
    busy = false;
    return;
  }
  busy = true;
  put("tasks", { ...task, status: "working" });
  setActivity("thinking", 9, -5.6, "Thinking at the workbench");
  put("runtime", {
    id: "agent",
    status: "thinking",
    taskId: task.id,
    detail:
      task.source === "autonomy"
        ? "Choosing a creative project…"
        : "Working on your request…",
    model: "lumen-local",
  });
  let timeout;
  try {
    const recent = all("messages")
      .slice(-6)
      .map((m) => ({ role: m.role, text: m.text }));
    const started = await client.sessions.create({
      message: task.message,
      clientContext: { memories: all("memory"), recentConversation: recent },
      signal: AbortSignal.timeout(30000),
    });
    currentSession = started.session;
    put("runtime", {
      id: "agent",
      status: "thinking",
      taskId: task.id,
      sessionId: started.session.id,
      detail:
        "Local model is working on " +
        (task.source === "autonomy" ? "its own creation." : "your request."),
      model: "lumen-local",
    });
    const result = await Promise.race([
      started.delivery.result(),
      new Promise((_, reject) => {
        timeout = setTimeout(
          () =>
            reject(
              new Error(
                "This session exceeded five minutes. Any completed objects are saved.",
              ),
            ),
          300000,
        );
      }),
    ]);
    if (result.status !== "completed")
      throw new Error(
        result.error?.message ||
          "The model stopped with status " + result.status,
      );
    const reply =
      typeof result.reply === "string"
        ? result.reply
        : JSON.stringify(result.reply ?? "Finished.");
    put("messages", {
      id: crypto.randomUUID(),
      role: "assistant",
      text: reply,
      source: task.source,
    });
    put("tasks", { ...task, status: "complete", reply });
    event(
      task.source === "autonomy"
        ? "Creative session complete"
        : "Request complete",
      reply.slice(0, 2500),
      "session",
    );
    if (settings().githubSync) {
      try {
        const { syncWorld } = await import("./lib/github.mjs");
        await syncWorld();
      } catch (e) {
        event("GitHub sync needs attention", e.message, "error");
      }
    }
  } catch (e) {
    const message = e.message || String(e);
    put("tasks", { ...task, status: "failed", error: message });
    event("Session needs attention", message, "error");
    put("messages", { id: crypto.randomUUID(), role: "system", text: message });
  } finally {
    clearTimeout(timeout);
    if (currentSession) {
      try {
        await currentSession.end({
          reason: "Bounded local session finished",
          signal: AbortSignal.timeout(10000),
        });
      } catch {}
      currentSession = null;
    }
    busy = false;
    nextCreative = Date.now() + settings().intervalMinutes * 60000;
  }
}
const assets = {
  "/": "public/index.html",
  "/app.js": "public/app.js",
  "/style.css": "public/style.css",
  "/vendor/three.module.js": "node_modules/three/build/three.module.js",
  "/vendor/three.core.js": "node_modules/three/build/three.core.js",
  "/vendor/OrbitControls.js":
    "node_modules/three/examples/jsm/controls/OrbitControls.js",
};
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
};
async function body(req) {
  let data = "";
  for await (const chunk of req) {
    data += chunk;
    if (data.length > 20000) throw new Error("Request too large");
  }
  return JSON.parse(data || "{}");
}
function json(res, data, status = 200) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  });
  res.end(JSON.stringify(data));
}
const server = http.createServer(async (req, res) => {
  try {
    if (![`127.0.0.1:${port}`, `localhost:${port}`].includes(req.headers.host))
      return json(res, { error: "Local access only" }, 403);
    if (
      req.headers.origin &&
      !["http://127.0.0.1:" + port, "http://localhost:" + port].includes(
        req.headers.origin,
      )
    )
      return json(res, { error: "Origin not allowed" }, 403);
    const pathname = new URL(req.url, "http://127.0.0.1").pathname;
    if (req.method === "GET" && pathname === "/api/state")
      return json(res, { ...state(), tasks: all("tasks").slice(-30) });
    if (req.method === "POST" && pathname === "/api/chat") {
      const { message } = await body(req);
      if (
        typeof message !== "string" ||
        !message.trim() ||
        message.length > 4000
      )
        throw new Error("Write a message of 1–4000 characters.");
      const task = enqueue(message.trim());
      void work();
      return json(res, { task }, 202);
    }
    if (req.method === "POST" && pathname === "/api/settings") {
      const b = await body(req);
      const next = { ...settings() };
      if (typeof b.autonomy === "boolean") next.autonomy = b.autonomy;
      if (typeof b.githubSync === "boolean") next.githubSync = b.githubSync;
      if (
        Number.isInteger(b.intervalMinutes) &&
        b.intervalMinutes >= 2 &&
        b.intervalMinutes <= 120
      )
        next.intervalMinutes = b.intervalMinutes;
      put("settings", next);
      return json(res, { settings: next });
    }
    if (req.method === "POST" && pathname === "/api/create") {
      if (!settings().autonomy) throw new Error("Allow creation first.");
      nextCreative = 0;
      void work();
      return json(res, { queued: true }, 202);
    }
    if (req.method === "POST" && pathname === "/api/sync") {
      const { syncWorld } = await import("./lib/github.mjs");
      return json(res, await syncWorld());
    }
    if (req.method === "GET" && pathname === "/api/export")
      return json(res, {
        objects: all("objects"),
        projects: all("projects"),
        books: all("books"),
      });
    if (req.method === "GET" && assets[pathname]) {
      const file = assets[pathname];
      res.writeHead(200, {
        "Content-Type": mime[path.extname(file)],
        "Cache-Control": "no-store",
      });
      res.end(await readFile(path.join(root, file)));
      return;
    }
    json(res, { error: "Not found" }, 404);
  } catch (e) {
    json(res, { error: e.message }, 400);
  }
});
server.listen(port, "127.0.0.1", () => {
  console.log("Lumen world: http://127.0.0.1:" + port);
  startRuntime().catch((e) =>
    event("Runtime startup failed", e.message, "error"),
  );
});
const timer = setInterval(
  () =>
    work().catch((e) => {
      busy = false;
      event("Worker failed", e.message, "error");
    }),
  5000,
);
// Publish backlog changes even when a session fails or the user is not viewing the world.
const syncTimer = setInterval(async () => {
  if (!settings().githubSync || Date.now() - lastSyncAttempt < 60000) return;
  lastSyncAttempt = Date.now();
  try { const { syncWorld } = await import("./lib/github.mjs"); await syncWorld(); }
  catch (e) { event("GitHub sync will retry", e.message, "error"); }
}, 60000);
function shutdown() {
  clearInterval(timer);
  clearInterval(syncTimer);
  child?.kill();
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 2000).unref();
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
