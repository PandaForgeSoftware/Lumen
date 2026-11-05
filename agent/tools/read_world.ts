import { defineTool } from "eve/tools";
import { z } from "zod";
import { context } from "../../lib/actions.mjs";
export default defineTool({
  description:
    "Read existing world objects, locations, projects, research book titles, and durable memories before acting.",
  inputSchema: z.object({}),
  execute: context,
});
