import { defineTool } from "eve/tools";
import { researchSchema, research } from "../../lib/actions.mjs";
export default defineTool({
  description:
    "Retrieve introductory Wikipedia source excerpts for a topic and save them as a real library book with source links. Does not independently fact-check the source.",
  inputSchema: researchSchema,
  execute: research,
});
