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

// The assertions test/page.spec.ts used to make in a browser about the 503 page's markup and
// stylesheet. They need no browser, so they live here.
const page503 = () => {
	const p = PAGES.find((x) => x.name === "503");
	if (!p) throw new Error("503");
	return render(p);
};

test("the 503 page announces its status politely and offers a retry button", () => {
	const html = page503();
	expect(html).toContain('role="status" aria-live="polite"');
	expect(html).toMatch(/<button type="button" id="retry">RETRY NOW<\/button>/);
	expect(html).toMatch(/id="msg"[^>]*>checking again in 30s</);
});

test("the 503 page changes colours with the colour scheme", () => {
	const html = page503();
	expect(html).toContain('<meta name="color-scheme" content="dark light">');
	expect(html).toMatch(/@media \(prefers-color-scheme:light\)\{:root\{--bg:#[0-9a-f]+/);
	expect(html).toMatch(/:root\{--bg:#0a0818/);
});

test("the 503 page stops its blinking cursor under reduced motion", () => {
	const html = page503();
	expect(html).toContain(
		"#status i{flex:none;width:.55rem;height:1rem;background:var(--cyan);animation:blink",
	);
	expect(html).toContain("@media (prefers-reduced-motion:reduce){#status i{animation:none}}");
});
