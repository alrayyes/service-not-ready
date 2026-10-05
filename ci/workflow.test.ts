import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

interface Step {
	uses?: string;
	run?: string;
	with?: Record<string, string | number>;
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
