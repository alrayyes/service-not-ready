import { expect, test } from "bun:test";
import { renderIndex } from "../scripts/reports-index";

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
