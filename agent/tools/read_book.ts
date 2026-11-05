import { defineTool } from "eve/tools";
import { z } from "zod";
import { get } from "../../lib/store.mjs";
import { setActivity, places } from "../../lib/embodiment.mjs";
export default defineTool({
  description:
    "Read a saved research book and its source links. Use read_world to find its id first.",
  inputSchema: z.object({ id: z.string().max(100) }),
  execute: ({ id }) => {
    const book = get("books", id);
    if (!book) throw new Error("Book not found");
    setActivity(
      "reading",
      places.library.x,
      places.library.z,
      "Reading " + book.title,
      { bookId: book.id },
    );
    return book;
  },
});
