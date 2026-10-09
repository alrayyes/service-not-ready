import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

interface Step {
	name?: string;
	if?: string;
	uses?: string;
	run?: string;
	with?: Record<string, string | number | boolean>;
}

const workflow = Bun.YAML.parse(
	readFileSync(new URL("../.github/workflows/ci.yml", import.meta.url), "utf8"),
) as {
	jobs: Record<
		string,
		{ steps: Step[]; needs?: string | string[]; if?: string; environment?: { name: string } }
	>;
};

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

// The reports (alrayyes.github.io#158): one Pages deployment, behind every other check.
const asList = (needs: string | string[] | undefined) => (Array.isArray(needs) ? needs : [needs]);

test("the lint job writes JUnit and converts lcov to Cobertura, on pull requests too", () => {
	const steps = workflow.jobs.lint?.steps ?? [];
	const tests = steps.find((s) => s.run?.includes("bun test --coverage"));
	expect(tests?.run).toContain("--reporter=junit");
	expect(tests?.run).toContain("reports/unit.xml");
	const convert = steps.find((s) => s.run?.includes("lcov_cobertura"));
	expect(convert?.run).toMatch(/lcov_cobertura==\d+\.\d+\.\d+/);
	expect(convert?.if).toBeUndefined();
});

test("the report jobs upload what they write", () => {
	for (const job of ["lint", "test"]) {
		const names = (workflow.jobs[job]?.steps ?? [])
			.filter((s) => s.uses?.startsWith("actions/upload-artifact@"))
			.map((s) => s.with?.name);
		expect(
			names.some((n) => String(n).startsWith("report-")),
			job,
		).toBe(true);
	}
});

test("the reports job needs every other job and assembles on pull requests too", () => {
	const reports = workflow.jobs.reports;
	expect(reports).toBeDefined();
	const others = Object.keys(workflow.jobs).filter(
		(name) => !["changes", "reports", "pages", "release", "image", "commits"].includes(name),
	);
	for (const name of others) expect(asList(reports?.needs), name).toContain(name);
	expect(reports?.if).toContain("always()");
	expect(reports?.if).not.toContain("github.event_name == 'push'");
});

test("only a push to main uploads the Pages artifact and only the pages job deploys", () => {
	const upload = workflow.jobs.reports?.steps.find((s) =>
		s.uses?.startsWith("actions/upload-pages-artifact@"),
	);
	expect(upload?.if).toContain("github.ref == 'refs/heads/main'");
	const pages = workflow.jobs.pages;
	expect(asList(pages?.needs)).toEqual(["reports"]);
	expect(pages?.if).toContain("github.event_name == 'push'");
	expect(pages?.environment?.name).toBe("github-pages");
	const all = Object.values(workflow.jobs).flatMap((j) => j.steps);
	expect(all.filter((s) => s.uses?.startsWith("actions/deploy-pages@"))).toHaveLength(1);
});

test("the pages job checks the live coverage.xml after the deploy", () => {
	const steps = workflow.jobs.pages?.steps ?? [];
	const deploy = steps.findIndex((s) => s.uses?.startsWith("actions/deploy-pages@"));
	const check = steps.findIndex((s) => s.run?.includes("reports/coverage/coverage.xml"));
	expect(deploy).toBeGreaterThanOrEqual(0);
	expect(check).toBeGreaterThan(deploy);
	expect(steps[check]?.run).toContain("grep -q '<coverage '");
});

test("every Pages action is pinned by SHA", () => {
	const pinned = steps.filter((s) =>
		/^actions\/(deploy-pages|upload-pages-artifact|download-artifact|configure-pages)@/.test(
			s.uses ?? "",
		),
	);
	expect(pinned.length).toBeGreaterThan(0);
	for (const s of pinned) expect(s.uses).toMatch(/@[0-9a-f]{40}$/);
});
