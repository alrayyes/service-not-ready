import { expect, test } from "bun:test";
import { changedGroups } from "./changed-groups";

const none = {
	lint: false,
	dockerfile: false,
	test: false,
	prose: false,
	markdown: false,
	yaml: false,
};

test("a docs-only change runs only the prose check", () => {
	expect(changedGroups(["CONTRIBUTING.md", "SECURITY.md"])).toEqual({
		...none,
		prose: true,
		markdown: true,
	});
});

test("the generated changelog runs nothing", () => {
	expect(changedGroups(["CHANGELOG.md"])).toEqual(none);
});

test.each([
	["Dockerfile", { dockerfile: true, test: true }],
	[".hadolint.yaml", { dockerfile: true, yaml: true }],
	[".dockerignore", { dockerfile: true, test: true }],
	["Caddyfile", { test: true }],
	["pages/404.html", { lint: true, test: true }],
	["src/template.html", { lint: true, test: true }],
	["scripts/build-pages.ts", { lint: true, test: true }],
	["test/page.spec.ts", { lint: true, test: true }],
	["playwright.config.ts", { lint: true, test: true }],
	["package.json", { lint: true, test: true, markdown: true }],
	["bun.lock", { lint: true, test: true, markdown: true }],
	["biome.json", { lint: true }],
	[".vale.ini", { prose: true }],
	["styles/config/vocabularies/House/accept.txt", { prose: true }],
	["scripts/lint-prose.sh", { prose: true }],
	["ci/changed-groups.ts", { lint: true }],
	["codecov.yml", { lint: true, yaml: true }],
	// bun test ./ci reads its badges.
	[".github/dependabot.yml", { yaml: true }],
	["README.md", { lint: true, prose: true, markdown: true }],
	["lefthook.yml", { lint: true, yaml: true }],
	[".prettierrc", { markdown: true, yaml: true }],
	[".prettierignore", { markdown: true, yaml: true }],
	[".markdownlint-cli2.yaml", { markdown: true, yaml: true }],
	[".ltex.json", { lint: true, markdown: true }],
	["scripts/lint-grammar.sh", { markdown: true }],
])("%s runs only the checks it covers", (file, expected) => {
	expect(changedGroups([file])).toEqual({ ...none, ...expected });
});

test("editing the workflow runs every job", () => {
	expect(changedGroups([".github/workflows/ci.yml"])).toEqual({
		lint: true,
		dockerfile: true,
		test: true,
		prose: true,
		markdown: true,
		yaml: true,
	});
});

test("a mixed change runs the union", () => {
	expect(changedGroups(["CONTRIBUTING.md", "Caddyfile"])).toEqual({
		...none,
		test: true,
		prose: true,
		markdown: true,
	});
});
