import { cp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

await rm("dist", { recursive: true, force: true });
await mkdir("dist/assets", { recursive: true });
for (const file of ["index.html", "styles.css", "catalog.json.gz"]) {
  await cp(file, `dist/${file}`);
}
const catalogHash = createHash("sha256").update(await readFile("catalog.json.gz")).digest("hex").slice(0, 12);
const app = (await readFile("app.js", "utf8")).replaceAll("__CATALOG_HASH__", catalogHash);
await writeFile("dist/app.js", app);
await cp("assets", "dist/assets", { recursive: true });
