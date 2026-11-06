import { defineTool } from "eve/tools";
import { z } from "zod";
import { consultHelper } from "../../lib/helpers.mjs";
export default defineTool({description:"Delegate a bounded design, analysis, writing or review task to a previously created local AI helper. Returns its actual model response. Execute and verify proposed world changes yourself. One helper runs at a time.",inputSchema:z.object({id:z.string(),task:z.string().min(1).max(6000)}),execute:consultHelper});
