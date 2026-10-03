import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import { type Running, ready, start, stop } from "./container";
import { capture } from "./screenshot";

let c: Running;

test.beforeAll(async () => {
	c = start();
	await ready(c.url);
});
test.afterAll(() => stop(c.name));

test("captures the page as a PNG the README and releases can use", async () => {
	const file = join(mkdtempSync(join(tmpdir(), "snr-shot-")), "screenshot.png");
	await capture(c.url, file);
	const png = readFileSync(file);
	expect(png.subarray(0, 8).toString("hex")).toBe("89504e470d0a1a0a");
	expect(png.length).toBeGreaterThan(5_000);
});
