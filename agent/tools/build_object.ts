import { defineTool } from "eve/tools";
import { buildSchema, build } from "../../lib/actions.mjs";
export default defineTool({
  description:
    "Create or improve a real 3D world object. Root x,z position the whole object in the world. Each part x,y,z is a LOCAL OFFSET from that root, normally x=0,z=0; do NOT repeat world coordinates in the parts. Parts sx,sy,sz are full widths/heights/depths. Space object roots at least five units apart. Use a stable lowercase id and #RRGGBB colors. Returns verified save result.",
  inputSchema: buildSchema,
  execute: build,
});
