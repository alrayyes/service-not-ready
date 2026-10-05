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

// Calls to rate-limited APIs, which an outage or a 403 strands: rules/release-publishing.md
// wants each wrapped in Wandalen/wretry.action, not run bare.
const WRAPPED = ["googleapis/release-please-action", "actions/attest-build-provenance"];

test.each(WRAPPED)("%s only runs inside a SHA-pinned wretry.action, 3 attempts", (action) => {
	expect(steps.filter((s) => s.uses?.startsWith(`${action}@`))).toEqual([]);
	const wrapped = steps.filter(
		(s) =>
			s.uses?.startsWith("Wandalen/wretry.action@") &&
			String(s.with?.action).startsWith(`${action}@`),
	);
	expect(wrapped).toHaveLength(1);
	const [step] = wrapped;
	if (!step) throw new Error(action);
	expect(step.uses).toMatch(/^Wandalen\/wretry\.action@[0-9a-f]{40}$/);
	expect(String(step.with?.action)).toMatch(/@[0-9a-f]{40}$/);
	expect(step.with?.attempt_limit).toBe(3);
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
