import { expect, test } from "bun:test";
import { mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pageName, stabilizeReports } from "../scripts/lighthouse-names";

const entry = (stamp: string, representative: boolean, url = "http://localhost/503.html") => ({
	url,
	isRepresentativeRun: representative,
	htmlPath: `/work/reports/lighthouse/localhost-503_html-${stamp}.report.html`,
	jsonPath: `/work/reports/lighthouse/localhost-503_html-${stamp}.report.json`,
	summary: { performance: 1 },
});

function fixture(entries: ReturnType<typeof entry>[]) {
	const dir = mkdtempSync(join(tmpdir(), "lhci-"));
	for (const e of entries) {
		for (const path of [e.htmlPath, e.jsonPath]) {
			writeFileSync(join(dir, path.split("/").pop() as string), path);
		}
	}
	writeFileSync(join(dir, "manifest.json"), JSON.stringify(entries));
	return dir;
}

test("names a page after its path, without the extension", () => {
	expect(pageName("http://localhost/503.html")).toBe("503");
	expect(pageName("http://localhost/")).toBe("index");
	expect(pageName("http://localhost/a/b.html")).toBe("a-b");
});

test("the representative run gets a bare, timestamp-free name", () => {
	const dir = fixture([entry("2026_10_16_12_00_00", false), entry("2026_10_16_12_00_09", true)]);
	stabilizeReports(dir);
	const files = readdirSync(dir);
	expect(files).toContain("503.report.html");
	expect(files).toContain("503.report.json");
	expect(readFileSync(join(dir, "503.report.html"), "utf8")).toContain("12_00_09");
});

test("the other runs are numbered from 2", () => {
	const dir = fixture([
		entry("2026_10_16_12_00_00", false),
		entry("2026_10_16_12_00_05", true),
		entry("2026_10_16_12_00_09", false),
	]);
	stabilizeReports(dir);
	expect(readdirSync(dir).sort()).toEqual([
		"503-2.report.html",
		"503-2.report.json",
		"503-3.report.html",
		"503-3.report.json",
		"503.report.html",
		"503.report.json",
		"manifest.json",
	]);
});

test("the manifest points at the new names, and every file it names exists", () => {
	const dir = fixture([entry("2026_10_16_12_00_00", true), entry("2026_10_16_12_00_09", false)]);
	stabilizeReports(dir);
	const manifest = JSON.parse(readFileSync(join(dir, "manifest.json"), "utf8")) as {
		htmlPath: string;
		jsonPath: string;
	}[];
	const files = readdirSync(dir);
	for (const { htmlPath, jsonPath } of manifest) {
		expect(files).toContain(htmlPath.split("/").pop() as string);
		expect(files).toContain(jsonPath.split("/").pop() as string);
		expect(htmlPath).not.toMatch(/\d{4}_\d{2}_\d{2}/);
	}
});

test("running it twice changes nothing", () => {
	const dir = fixture([entry("2026_10_16_12_00_00", true)]);
	stabilizeReports(dir);
	const once = readdirSync(dir).sort();
	stabilizeReports(dir);
	expect(readdirSync(dir).sort()).toEqual(once);
});

test("fails, leaving the manifest alone, when a file the manifest names is missing", () => {
	const dir = fixture([entry("2026_10_16_12_00_00", true)]);
	rmSync(join(dir, "localhost-503_html-2026_10_16_12_00_00.report.json"));
	const before = readFileSync(join(dir, "manifest.json"), "utf8");
	expect(() => stabilizeReports(dir)).toThrow("does not exist");
	expect(readFileSync(join(dir, "manifest.json"), "utf8")).toBe(before);
});
