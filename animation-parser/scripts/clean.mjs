import { rm } from "node:fs/promises";
for (const directory of ["dist", "coverage"]) {
  await rm(new URL(`../${directory}`, import.meta.url), { recursive: true, force: true });
}
