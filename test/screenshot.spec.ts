import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { type Running, ready, start, stop } from "./container";
import { captureAll } from "./screenshot";

// Hardcoded, like the list in pages.spec.ts: adding a page means adding it here too.
const NAMES = ["401", "403", "404", "429", "500", "502", "503", "504", "error"];

let c: Running;

test.beforeAll(async () => {
	c = start();
	await ready(c.url);
});
test.afterAll(() => stop(c.name));

test("captures every page as a PNG the README and releases can use", async () => {
	const dir = mkdtempSync(join(tmpdir(), "snr-shot-"));
	const files = await captureAll(c.url, dir);
	expect(files.map((f) => f.split("/").pop())).toEqual(NAMES.map((n) => `screenshot-${n}.png`));
	for (const file of files) {
		const png = readFileSync(file);
		expect(png.subarray(0, 8).toString("hex"), file).toBe("89504e470d0a1a0a");
		expect(png.length, file).toBeGreaterThan(5_000);
	}
});
