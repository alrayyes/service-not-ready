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

// What test/pages.spec.ts used to assert once per page in a browser. The pages share one
// template, so this holds each of them to it in milliseconds; the browser keeps one poll page
// and one static page to prove they render and behave.
const rendered = PAGES.map((p) => ({ page: p, html: render(p) }));

test.each(rendered)("$page.name has its own title and heading", ({ page, html }) => {
	expect(html).toContain(`<title>${page.title}</title>`);
	expect(html).toContain(`<h1>${page.heading}</h1>`);
});

test.each(rendered)("$page.name has a polite status line and no meta refresh", ({ html }) => {
	expect(html).toContain('role="status" aria-live="polite"');
	expect(html).not.toMatch(/<meta[^>]*http-equiv=["']?refresh/i);
});

test.each(rendered)("$page.name is one file that fetches nothing external", ({ html }) => {
	expect(html).not.toMatch(/<link[^>]*rel=["']?stylesheet/i);
	expect(html).not.toMatch(/<script[^>]*\ssrc=/i);
	expect(html).not.toMatch(/<img[^>]*\ssrc=/i);
	expect(html).not.toMatch(/(?:https?:)?\/\/[a-z0-9.-]+\.[a-z]{2,}/i);
});

test.each(rendered.filter((r) => r.page.kind === "poll"))(
	"$page.name polls for its own status and says its own state",
	({ page, html }) => {
		expect(html).toContain(`r.status !== ${page.code}`);
		expect(html).toContain(`still ${page.state}.`);
	},
);

// Pages that never ask the server again: only the polling and countdown pages call fetch.
test.each(rendered.filter((r) => r.page.kind === "back" || r.page.kind === "reload"))(
	"$page.name never calls fetch or polls",
	({ html }) => {
		expect(html).not.toContain("fetch(");
		expect(html).not.toContain("checking again");
	},
);

// Literal expectations, so the tests above can't agree with a wrong PAGES row just because
// both read it. If a heading or status code changes on purpose, change it here too.
test("the nine pages have these headings", () => {
	expect(Object.fromEntries(PAGES.map((p) => [p.name, p.heading]))).toEqual({
		"401": "Sign in required",
		"403": "Access denied",
		"404": "Page not found",
		"429": "Slow down",
		"500": "Something broke",
		"502": "Bad gateway",
		"503": "Service not ready",
		"504": "Gateway timeout",
		error: "Something went wrong",
	});
});

test("only 502, 503 and 504 poll, each for its own status", () => {
	expect(
		Object.fromEntries(PAGES.filter((p) => p.kind === "poll").map((p) => [p.name, p.code])),
	).toEqual({ "502": 502, "503": 503, "504": 504 });
	expect(render(PAGES.find((p) => p.name === "503") as (typeof PAGES)[number])).toContain(
		"r.status !== 503",
	);
});
