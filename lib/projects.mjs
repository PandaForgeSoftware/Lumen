import { z } from "zod";
import { all, get, put, settings } from "./store.mjs";
export const projectSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,60}$/),
  title: z.string().min(1).max(100), description: z.string().min(1).max(1500),
  status: z.enum(["planned", "working", "blocked", "complete"]),
  nextStep: z.string().max(1000), objectId: z.string().max(60).optional(),
});
export function planProject(input) {
  if (!settings().autonomy) throw new Error("World editing is paused by the owner.");
  const p = projectSchema.parse(input), previous = get("projects", p.id);
  if (!previous && all("projects").filter(p => p.status !== "complete").length >= 20)
    throw new Error("Finish or update an existing project before adding more.");
  const object = p.objectId && get("objects", p.objectId);
  if (p.status === "complete" && !object) throw new Error("Complete projects must reference a saved world object.");
  const taskId = get("runtime", "agent")?.taskId;
  const task = taskId ? get("tasks", taskId) : null;
  return put("projects", { ...p, publish: previous ? previous.publish === true : task?.source === "autonomy" });
}
