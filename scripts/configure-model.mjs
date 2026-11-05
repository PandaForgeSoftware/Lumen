import { execFile } from "node:child_process";
import { promisify } from "node:util";
const exec = promisify(execFile);
const result = await exec(
  "ollama",
  ["create", "lumen-local", "-f", "Modelfile"],
  { windowsHide: true },
);
console.log("Lumen model profile configured.");
