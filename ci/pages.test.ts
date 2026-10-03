import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { PAGES, render } from "../src/pages";

test.each(PAGES.map((p) => p.name))("pages/%s.html is up to date (run bun run build)", (name) => {
	const page = PAGES.find((p) => p.name === name);
	if (!page) throw new Error(name);
	expect(readFileSync(new URL(`../pages/${name}.html`, import.meta.url), "utf8")).toBe(
		render(page),
	);
});

test("no placeholder survives rendering", () => {
	for (const page of PAGES) expect(render(page)).not.toMatch(/\{\{|\/\*BEHAVIOR\*\//);
});
