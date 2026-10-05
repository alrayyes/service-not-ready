import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const read = (name: string) => readFileSync(new URL(`../${name}`, import.meta.url), "utf8");

const packageManager = (JSON.parse(read("package.json")) as { packageManager: string })
	.packageManager;
const pinned = packageManager.replace(/^bun@/, "");
const workflow = read(".github/workflows/ci.yml");
const ciVersions = [...workflow.matchAll(/bun-version: (\S+)/g)].map((m) => m[1]);

// rules/javascript.md: stay below bun 1.4 until Dependabot's bundled bun reads lockfileVersion 2.
test("bun is pinned below 1.4", () => {
	expect(pinned).toMatch(/^1\.3\.\d+$/);
});

test("packageManager and every CI job use the same bun", () => {
	expect(ciVersions.length).toBeGreaterThan(0);
	for (const v of ciVersions) expect(v).toBe(pinned);
});

test("the lockfile is the v1 format that bun below 1.4 and Dependabot agree on", () => {
	expect(read("bun.lock")).toContain('"lockfileVersion": 1');
});
