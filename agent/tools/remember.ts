import { defineTool } from "eve/tools";
import { rememberSchema, remember } from "../../lib/actions.mjs";
export default defineTool({
  description:
    "Save a durable preference or lesson in local memory, using a stable ID.",
  inputSchema: rememberSchema,
  execute: remember,
});
