import { expect, test } from "bun:test";
import { changedGroups } from "./changed-groups";

const none = { lint: false, dockerfile: false, test: false };

test("a docs-only change runs nothing", () => {
	expect(changedGroups(["README.md", "docs/a.md", "CHANGELOG.md"])).toEqual(none);
});

test.each([
	["Dockerfile", { dockerfile: true, test: true }],
	[".hadolint.yaml", { dockerfile: true }],
	[".dockerignore", { dockerfile: true, test: true }],
	["Caddyfile", { test: true }],
	["503.html", { test: true }],
	["test/page.spec.ts", { lint: true, test: true }],
	["playwright.config.ts", { lint: true, test: true }],
	["package.json", { lint: true, test: true }],
	["bun.lock", { lint: true, test: true }],
	["biome.json", { lint: true }],
	["ci/changed-groups.ts", { lint: true }],
])("%s runs only the checks it covers", (file, expected) => {
	expect(changedGroups([file])).toEqual({ ...none, ...expected });
});

test("editing the workflow runs every job", () => {
	expect(changedGroups([".github/workflows/ci.yml"])).toEqual({
		lint: true,
		dockerfile: true,
		test: true,
	});
});

test("a mixed change runs the union", () => {
	expect(changedGroups(["README.md", "Caddyfile"])).toEqual({ ...none, test: true });
});
