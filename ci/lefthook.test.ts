import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

interface Job {
	name?: string;
	run?: string;
	glob?: string | string[];
	stage_fixed?: boolean;
}
interface Hook {
	jobs?: Job[];
}

const read = (name: string) => readFileSync(new URL(`../${name}`, import.meta.url), "utf8");
const config = Bun.YAML.parse(read("lefthook.yml")) as Record<string, Hook | unknown>;
const hook = (name: string) => (config[name] as Hook | undefined)?.jobs ?? [];
const runs = (name: string) => hook(name).map((j) => j.run ?? "");

test("output is silent on success", () => {
	expect(config.output).toEqual(["failure"]);
});

test("pre-commit lets biome and sort-package-json fix and restage a commit", () => {
	const jobs = hook("pre-commit");
	const biome = jobs.find((j) => j.run?.includes("biome"));
	const sort = jobs.find((j) => j.run?.includes("sort-package-json"));
	expect(biome?.run).toContain("--write");
	expect(biome?.stage_fixed).toBe(true);
	expect(sort?.stage_fixed).toBe(true);
});

test("pre-commit lets prettier fix and restage Markdown", () => {
	const prettier = hook("pre-commit").find((j) => j.run?.includes("prettier"));
	expect(prettier?.run).toContain("--write");
	expect(prettier?.stage_fixed).toBe(true);
	expect(prettier?.glob).toBe("*.{md,yml,yaml}");
});

test("pre-push checks the three Markdown tiers without writing", () => {
	const all = runs("pre-push").join("\n");
	for (const expected of [
		"lint:md:format",
		"lint:md:structure",
		"lint:md:grammar",
		"lint:yaml:format",
	]) {
		expect(all, expected).toContain(expected);
	}
});

test("commit-msg runs commitlint", () => {
	expect(runs("commit-msg").some((r) => r.includes("commitlint"))).toBe(true);
});

test("pre-push checks lint, types, the drift test, the image tests, hadolint and the build", () => {
	const all = runs("pre-push").join("\n");
	for (const expected of [
		"biome check",
		"sort-package-json --check",
		"tsc",
		"bun test ./ci",
		"playwright test",
		"hadolint",
		"docker build",
	]) {
		expect(all, expected).toContain(expected);
	}
});

test("pre-push never writes", () => {
	for (const job of hook("pre-push")) {
		expect(job.stage_fixed, job.name).toBeUndefined();
		expect(job.run, job.name).not.toMatch(/--write|--fix|build-pages\.ts(?! --check)/);
	}
});

test("every pipeline job runs with hooks off", () => {
	const workflow = Bun.YAML.parse(read(".github/workflows/ci.yml")) as {
		env?: Record<string, string>;
	};
	expect(String(workflow.env?.LEFTHOOK)).toBe("0");
});
