import { DatabaseSync } from "node:sqlite";
import { mkdirSync } from "node:fs";
import path from "node:path";
const root = path.resolve(process.env.LUMEN_DATA_DIR || "data");
mkdirSync(root, { recursive: true });
const db = new DatabaseSync(path.join(root, "lumen.sqlite"));
db.exec(
  "PRAGMA busy_timeout=5000; PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS records (collection TEXT NOT NULL,id TEXT NOT NULL,json TEXT NOT NULL,PRIMARY KEY(collection,id));",
);
export function all(collection) {
  return db
    .prepare("SELECT json FROM records WHERE collection=? ORDER BY rowid")
    .all(collection)
    .map((r) => JSON.parse(r.json));
}
export function get(collection, id) {
  const r = db
    .prepare("SELECT json FROM records WHERE collection=? AND id=?")
    .get(collection, id);
  return r ? JSON.parse(r.json) : null;
}
export function put(collection, item) {
  const saved = { ...item, updatedAt: new Date().toISOString() };
  db.prepare(
    "INSERT INTO records(collection,id,json) VALUES(?,?,?) ON CONFLICT(collection,id) DO UPDATE SET json=excluded.json",
  ).run(collection, item.id, JSON.stringify(saved));
  return saved;
}
export function event(title, detail, kind = "info") {
  return put("events", { id: crypto.randomUUID(), title, detail, kind });
}
export function settings() {
  return get("settings", "main");
}
export function state() {
  return {
    settings: settings(),
    objects: all("objects"),
    books: all("books"),
    projects: all("projects"),
    messages: all("messages").slice(-60),
    events: all("events").slice(-60),
    memories: all("memory"),
    agent: get("runtime", "agent"),
    embodiment: get("runtime", "embodiment"),
  };
}
export function init() {
  if (!settings())
    put("settings", {
      id: "main",
      autonomy: true,
      intervalMinutes: 10,
      model: "qwen3:4b",
      github: "https://github.com/PandaForgeSoftware/Lumen",
      githubSync: false,
      device: "Home PC",
    });
  if (!get("memory", "identity"))
    put("memory", {
      id: "identity",
      text: "I am Lumen, a local AI companion. My owner wants a persistent virtual world I can build and inhabit. At home means this main Home PC. Personal data stays local. I must describe real work honestly.",
    });
  if (!get("objects", "welcome-library")) {
    put("objects", {
      id: "welcome-library",
      name: "The Library",
      purpose: "Open stored research books here.",
      x: -9,
      z: -7,
      category: "library",
      color: "#c7b58c",
      parts: [
        {
          shape: "box",
          x: 0,
          y: 1.5,
          z: 0,
          sx: 6,
          sy: 3,
          sz: 5,
          color: "#d7c8a5",
        },
        {
          shape: "cone",
          x: 0,
          y: 4,
          z: 0,
          sx: 5,
          sy: 2,
          sz: 5,
          color: "#4b786c",
        },
      ],
      author: "setup",
    });
    put("objects", {
      id: "workshop",
      name: "Workshop",
      purpose: "A place to develop new world designs.",
      x: 9,
      z: -6,
      category: "building",
      color: "#bca678",
      parts: [
        {
          shape: "box",
          x: 0,
          y: 1.2,
          z: 0,
          sx: 5,
          sy: 2.4,
          sz: 4,
          color: "#b99872",
        },
        {
          shape: "box",
          x: 0,
          y: 2.7,
          z: 0,
          sx: 5.5,
          sy: 0.6,
          sz: 4.5,
          color: "#41665b",
        },
      ],
      author: "setup",
    });
    put("objects", {
      id: "pip",
      name: "Pip",
      purpose: "A decorative virtual fox companion.",
      x: 3,
      z: 3,
      category: "pet",
      color: "#d49b61",
      parts: [],
      author: "setup",
    });
    event(
      "A new beginning",
      "The local 3D world is ready. These initial buildings are setup assets; Lumen has not yet designed anything.",
    );
  }
}
init();
