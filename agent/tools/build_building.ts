import { defineTool } from "eve/tools";
import { buildingSchema, buildBuilding } from "../../lib/buildings.mjs";
export default defineTool({
  description: "Build an actual furnished, enterable building with a clear front doorway, floor, walls and roof. Choose its name, purpose, position, dimensions, colors and room use. Read the world first and choose a clear plot, at least 12 units from other building centers. Prefer this for useful rooms instead of solid sculptures.",
  inputSchema: buildingSchema,
  execute: buildBuilding,
});
