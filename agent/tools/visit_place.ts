import { defineTool } from "eve/tools";
import { z } from "zod";
import { goToPlace } from "../../lib/embodiment.mjs";
export default defineTool({
  description:
    "Choose somewhere in your virtual world to visit. Your visible character walks there. The library holds real books, the workshop holds projects, and the cottage holds your journal. This does not perform research or build anything by itself.",
  inputSchema: z.object({
    place: z.enum([
      "library",
      "workshop",
      "cottage",
      "overlook",
      "pond",
      "commons",
    ]),
  }),
  execute: ({ place }) => goToPlace(place),
});
