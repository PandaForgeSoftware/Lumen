import { defineAgent } from "eve";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
const local = createOpenAICompatible({
  name: "ollama",
  baseURL: "http://127.0.0.1:11434/v1",
  includeUsage: true,
});
export default defineAgent({
  model: local("lumen-local"),
  modelContextWindowTokens: 8192,
  reasoning: "none",
  modelOptions: { providerOptions: { ollama: { reasoningEffort: "none" } } },
  defaultTools: false,
  limits: {
    sessionUsage: ({ window }) =>
      window.outputTokens > 6000 || window.inputTokens > 30000,
  },
});
