import { defineTool } from "eve/tools";
import { projectSchema, planProject } from "../../lib/projects.mjs";
export default defineTool({description:"Save or update a real project backlog entry: planned, working, blocked or complete. Use a stable id and a concrete next step. Complete requires an existing objectId. Independent-session plans are public on GitHub; keep them generic and exclude personal information.",inputSchema:projectSchema,execute:planProject});
