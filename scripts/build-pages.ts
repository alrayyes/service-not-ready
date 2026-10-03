import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { PAGES, render } from "../src/pages";

// bun scripts/build-pages.ts          writes pages/<name>.html
// bun scripts/build-pages.ts --check  fails if the committed pages are stale
const check = process.argv.includes("--check");
const out = new URL("../pages/", import.meta.url);
mkdirSync(out, { recursive: true });
let stale = 0;
for (const page of PAGES) {
	const file = new URL(`${page.name}.html`, out);
	const html = render(page);
	if (!check) writeFileSync(file, html);
	else if (readFileSync(file, "utf8") !== html) {
		console.error(`stale: pages/${page.name}.html (run bun run build)`);
		stale += 1;
	}
}
process.exit(stale ? 1 : 0);
