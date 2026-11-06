import { defineTool } from "eve/tools";
import { helperSchema, createHelper } from "../../lib/helpers.mjs";
export default defineTool({description:"Create or update a persistent local AI specialist with a name and specialty, up to eight helpers. Helpers provide advice or drafts using the local model; they are not conscious or independent computer operators.",inputSchema:helperSchema,execute:createHelper});
