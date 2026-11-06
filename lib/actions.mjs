import { z } from "zod";
import { setActivity, places } from "./embodiment.mjs";
import { all, get, put, event, settings } from "./store.mjs";
const id = z.string().regex(/^[a-z0-9-]{1,60}$/);
const color = z.string().regex(/^#[0-9a-fA-F]{6}$/);
export const buildSchema = z.object({
  id,
  name: z.string().min(1).max(80),
  purpose: z.string().min(1).max(1000),
  x: z.number().min(-35).max(35),
  z: z.number().min(-35).max(35),
  category: z.enum([
    "building",
    "garden",
    "sculpture",
    "library",
    "pet",
    "path",
  ]),
  color,
  parts: z
    .array(
      z.object({
        shape: z.enum(["box", "sphere", "cylinder", "cone"]),
        x: z.number().min(-10).max(10),
        y: z.number().min(0).max(15),
        z: z.number().min(-10).max(10),
        sx: z.number().min(0.1).max(12),
        sy: z.number().min(0.1).max(15),
        sz: z.number().min(0.1).max(12),
        color,
      }),
    )
    .max(24),
});
export function build(input) {
  if (!settings().autonomy)
    throw new Error("World editing is paused by the owner.");
  const item = buildSchema.parse(input);
  const reserved = [
    { x: -9, z: -7, w: 12, d: 10 },
    { x: 9, z: -7, w: 10, d: 10 },
    { x: -23, z: 20, w: 8, d: 8 },
  ];
  if (
    reserved.some(
      (r) =>
        Math.abs(item.x - r.x) < r.w / 2 + 2 &&
        Math.abs(item.z - r.z) < r.d / 2 + 2,
    )
  )
    throw new Error(
      "This is an occupied building interior. Choose an open plot outside the library, workshop and cottage.",
    );
  if (!item.parts.length && item.category !== "pet")
    throw new Error("Provide at least one visible shape.");
  if (!get("objects", item.id) && all("objects").length >= 180)
    throw new Error("World is full; improve an existing object.");
  const collisions = all("objects").filter(
    (o) => o.id !== item.id && Math.hypot(o.x - item.x, o.z - item.z) < 5,
  );
  if (collisions.length)
    throw new Error(
      "Too close to " +
        collisions.map((o) => o.name).join(", ") +
        ". Choose a position at least five units away.",
    );
  const active = get("runtime", "agent");
  const task = active?.taskId ? get("tasks", active.taskId) : null;
  put("objects", {
    ...item,
    author: "Lumen",
    construction: { startedAt: Date.now(), durationMs: Math.max(8000, item.parts.length * 900) },
    publish: task?.source === "autonomy",
  });
  put("projects", {
    id: item.id,
    title: item.name,
    description: item.purpose,
    status: "complete",
    objectId: item.id,
  });
  setActivity("building", item.x, item.z, "Building " + item.name, {
    objectId: item.id,
  });
  event("Built " + item.name, item.purpose, "creation");
  return {
    saved: true,
    id: item.id,
    name: item.name,
    position: { x: item.x, z: item.z },
  };
}
export const rememberSchema = z.object({
  id,
  text: z.string().min(1).max(3000),
});
export function remember(input) {
  const note = rememberSchema.parse(input);
  put("memory", note);
  setActivity(
    "writing",
    places.cottage.x,
    places.cottage.z,
    "Writing in my journal",
  );
  return { saved: true, id: note.id };
}
export const researchSchema = z.object({ topic: z.string().min(2).max(160) });
export async function research(input) {
  const { topic } = researchSchema.parse(input);
  const existing = all("books").find(
    (book) => book.title?.trim().toLowerCase() === topic.trim().toLowerCase(),
  );
  if (existing) {
    setActivity("reading", places.library.x, places.library.z,
      "Reading " + existing.title, { bookId: existing.id });
    return existing;
  }
  setActivity(
    "researching",
    places.library.x,
    places.library.z,
    "Researching " + topic,
  );
  const url = new URL("https://en.wikipedia.org/w/api.php");
  url.search = new URLSearchParams({
    action: "query",
    generator: "search",
    gsrsearch: topic,
    gsrlimit: "2",
    prop: "extracts|info",
    explaintext: "1",
    exintro: "1",
    inprop: "url",
    format: "json",
  }).toString();
  const r = await fetch(url, {
    signal: AbortSignal.timeout(25000),
    headers: { "User-Agent": "LumenLocal/0.1 (personal research assistant)" },
  });
  if (!r.ok) throw new Error("Research source returned " + r.status);
  const data = await r.json();
  const pages = Object.values(data.query?.pages || {});
  if (!pages.length)
    throw new Error("No source found. Try a more specific topic.");
  const book = {
    id: "research-" + crypto.randomUUID(),
    title: topic,
    body: pages
      .map((p) => p.title + "\n" + String(p.extract || "").slice(0, 6000))
      .join("\n\n"),
    sources: pages.map((p) => p.fullurl).filter(Boolean),
    scope:
      "Introductory source excerpts from Wikipedia, not independently verified comprehensive research.",
    author: "Lumen",
  };
  put("books", book);
  setActivity(
    "reading",
    places.library.x,
    places.library.z,
    "Shelving a book about " + topic,
    { bookId: book.id },
  );
  event(
    "Added research: " + topic,
    "Saved source excerpts and links in the library.",
    "research",
  );
  return book;
}
export function context() {
  return {
    objects: all("objects").map(({ id, name, x, z, purpose }) => ({
      id,
      name,
      x,
      z,
      purpose,
    })),
    projects: all("projects"),
    books: all("books").map(({ id, title, sources }) => ({
      id,
      title,
      sources,
    })),
    memories: all("memory"),
    places,
    embodiment: get("runtime", "embodiment"),
    controls: { autonomy: settings().autonomy },
    capabilities:
      "Can design composite 3D objects and decorative pets, remember facts and research introductory Wikipedia sources. No general desktop control or arbitrary code execution.",
  };
}
