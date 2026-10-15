import { expect, test } from "bun:test";
import { renderDirectoryIndex, renderIndex } from "../scripts/reports-index";

const meta = { sha: "3dd8b70abcdef", date: "2026-10-09" };

test("lists each report it is given, with a relative link", () => {
	const html = renderIndex(["tests/unit.xml", "coverage/coverage.xml"], meta);
	expect(html).toContain('href="tests/unit.xml"');
	expect(html).toContain('href="coverage/coverage.xml"');
});

test("names the commit and the date", () => {
	const html = renderIndex(["tests/unit.xml"], meta);
	expect(html).toContain("3dd8b70");
	expect(html).toContain("2026-10-09");
});

test("leaves out a report that does not exist", () => {
	const html = renderIndex(["tests/unit.xml"], meta);
	expect(html).not.toContain("coverage");
	expect(html).not.toContain("lighthouse");
});

test("says the coverage covers only the tooling tests", () => {
	const html = renderIndex(["coverage/index.html"], meta);
	expect(html).toContain("./ci");
});

test("escapes what it prints", () => {
	const html = renderIndex(["tests/<b>.xml"], meta);
	expect(html).not.toContain("<b>");
});

test("links the Lighthouse directory from the main index", () => {
	const html = renderIndex(["lighthouse/index.html", "tests/unit.xml"], meta);
	expect(html).toContain('href="lighthouse/index.html"');
});

test("a directory index links each file by a relative name", () => {
	const html = renderDirectoryIndex("Lighthouse reports", [
		"localhost-503_html-2026_10_15_12_04_24.report.html",
		"manifest.json",
	]);
	expect(html).toContain('href="localhost-503_html-2026_10_15_12_04_24.report.html"');
	expect(html).toContain('href="manifest.json"');
	expect(html).toContain("<h1>Lighthouse reports</h1>");
});

test("a directory index never links the way back up or another site", () => {
	const html = renderDirectoryIndex("Lighthouse reports", ["a.report.html"]);
	expect(html).not.toContain('href="/');
	expect(html).not.toContain('href="..');
	expect(html).not.toContain("http");
});

test("a directory index escapes what it prints", () => {
	const html = renderDirectoryIndex("<x>", ["<b>.html"]);
	expect(html).not.toContain("<x>");
	expect(html).not.toContain("<b>");
});
