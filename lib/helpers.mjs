import { z } from "zod";
import { all, get, put } from "./store.mjs";
export const helperSchema = z.object({
  id: z.string().regex(/^[a-z0-9-]{1,40}$/), name: z.string().min(1).max(60),
  specialty: z.string().min(5).max(1500),
});
export function createHelper(input) {
  const helper = helperSchema.parse(input);
  if (!get("helpers", helper.id) && all("helpers").length >= 8) throw new Error("Use one of the eight existing helpers.");
  return put("helpers", helper);
}
let occupied = false;
export async function consultHelper({ id, task }) {
  const helper = get("helpers", id);
  if (!helper) throw new Error("Create this helper first.");
  if (occupied) throw new Error("A helper is already running. Wait for its result.");
  if (typeof task !== "string" || !task.trim() || task.length > 6000) throw new Error("Provide a task of 1–6000 characters.");
  occupied = true;
  const job = { id: crypto.randomUUID(), helperId: id, task, status: "working" };
  put("helperJobs", job);
  try {
    const response = await fetch("http://127.0.0.1:11434/api/chat", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ model: "lumen-local", stream: false, think: false,
        options: { num_predict: 700 }, messages: [
          {role:"system",content:"You are a local AI helper named " + helper.name + ". Specialty: " + helper.specialty + ". Produce concise advice or a draft for Lumen. You cannot execute tools, browse, create other helpers, or claim completed actions. Be explicit about uncertainties."},
          {role:"user",content:task},
        ] }), signal: AbortSignal.timeout(90000),
    });
    if (!response.ok) throw new Error("Local helper model returned " + response.status);
    const result = (await response.json()).message?.content;
    if (!result) throw new Error("The helper returned no answer.");
    put("helperJobs", { ...job, status: "complete", result });
    return { helper: helper.name, result, note: "Local AI advice; Lumen must execute and verify any proposed action." };
  } catch (error) {
    put("helperJobs", { ...job, status: "failed", error: error.message });
    throw error;
  } finally { occupied = false; }
}
