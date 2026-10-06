import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

interface Step {
	uses?: string;
	run?: string;
	with?: Record<string, string | number | boolean>;
}

const workflow = Bun.YAML.parse(
	readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8"),
) as { jobs: Record<string, { steps: Step[] }> };

const steps = Object.values(workflow.jobs).flatMap((job) => job.steps);

// Under Node 24 Wandalen/wretry.action reports success and never runs the action it wraps, so
// a release silently stops. Release steps are called directly, SHA-pinned.
const DIRECT = ["googleapis/release-please-action", "actions/attest-build-provenance"];

test("no step runs inside Wandalen/wretry.action", () => {
	expect(steps.filter((s) => s.uses?.startsWith("Wandalen/wretry.action@"))).toEqual([]);
});

test.each(DIRECT)("%s is a direct, SHA-pinned step", (action) => {
	const direct = steps.filter((s) => s.uses?.startsWith(`${action}@`));
	expect(direct).toHaveLength(1);
	expect(direct[0]?.uses).toMatch(/@[0-9a-f]{40}$/);
});

test("the lint job reports unit-test coverage in the job summary", () => {
	const lint = workflow.jobs.lint;
	const runs = (lint?.steps ?? []).map((s) => s.run ?? "");
	const coverage = runs.find((r) => r.includes("bun test --coverage ./ci"));
	expect(coverage, "no coverage step").toBeDefined();
	expect(coverage).toContain("$GITHUB_STEP_SUMMARY");
});

test("the lint job uploads the lcov report to Codecov, and a failed upload fails the job", () => {
	const lint = workflow.jobs.lint;
	const steps = lint?.steps ?? [];
	const tests = steps.find((s) => s.run?.includes("bun test --coverage"));
	expect(tests?.run).toContain("--coverage-reporter=lcov");
	const upload = steps.find((s) => s.uses?.startsWith("codecov/codecov-action@"));
	expect(upload?.uses).toMatch(/^codecov\/codecov-action@[0-9a-f]{40}$/);
	expect(upload?.with?.token).toBe(`\${{ secrets.CODECOV_TOKEN }}`);
	expect(upload?.with?.fail_ci_if_error).toBe(true);
	expect(upload?.with?.files).toBe("coverage/lcov.info");
});

test("Codecov adds no status checks and no PR comment", () => {
	const codecov = Bun.YAML.parse(
		readFileSync(new URL("../codecov.yml", import.meta.url), "utf8"),
	) as { coverage: { status: Record<string, unknown> }; comment: unknown };
	expect(codecov.coverage.status.project).toBe("off");
	expect(codecov.coverage.status.patch).toBe("off");
	expect(codecov.comment).toBe(false);
});

// An advisory with no patched version is the one justified ignore, ticketed (#46) and exact.
test("the audit job ignores only GHSA-vfj7-8cjw-p6xm", () => {
	const run = (workflow.jobs.audit?.steps ?? []).map((s) => s.run ?? "").join("\n");
	expect([...run.matchAll(/--ignore[= ](\S+)/g)].map((m) => m[1])).toEqual(["GHSA-vfj7-8cjw-p6xm"]);
});

// The three Markdown tiers (rules/markdown.md) are separate jobs, so a red run names the tier,
// and each is skipped when no Markdown changed.
test.each(["markdown-format", "markdown-structure", "markdown-grammar"])(
	"%s is its own job, gated on the markdown path group",
	(name) => {
		const job = workflow.jobs[name] as unknown as { if?: string; needs?: string };
		expect(job, name).toBeDefined();
		expect(job.needs).toBe("changes");
		expect(job.if).toContain("needs.changes.outputs.markdown");
	},
);

test("the grammar job proves LTeX fails on a real error", () => {
	const steps = (workflow.jobs["markdown-grammar"]?.steps ?? []).map((s) => s.run ?? "");
	expect(steps.some((r) => r.includes("an university"))).toBe(true);
});

test("yaml-format is its own job, gated on the yaml path group", () => {
	const job = workflow.jobs["yaml-format"] as unknown as { if?: string; needs?: string };
	expect(job).toBeDefined();
	expect(job.needs).toBe("changes");
	expect(job.if).toContain("needs.changes.outputs.yaml");
});
