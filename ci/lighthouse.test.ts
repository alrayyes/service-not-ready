import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";

const config = JSON.parse(
	readFileSync(new URL("../lighthouserc.json", import.meta.url), "utf8"),
) as {
	ci: {
		collect: { numberOfRuns: number; url: string[]; settings: { onlyCategories?: string[] } };
		assert: { aggregationMethod?: string };
	};
};

// One run on a shared CI runner scored 0.84 on a page with no script worth measuring, and the
// same commit passed on the pull request. the assertions run against the median run, so a
// single noisy one can't fail the push to main.
test("Lighthouse CI asserts on the median of at least three runs", () => {
	expect(config.ci.collect.numberOfRuns).toBeGreaterThanOrEqual(3);
});

test("the assertions use the median run, not the best or the worst", () => {
	expect(config.ci.assert.aggregationMethod).toBe("median-run");
});

test("it audits the 503 page", () => {
	expect(config.ci.collect.url).toEqual(["http://localhost/503.html"]);
});

// The page is an error page and is never indexed, so an SEO score is noise in the report.
test("it audits every category except SEO", () => {
	expect(config.ci.collect.settings.onlyCategories).toEqual([
		"performance",
		"accessibility",
		"best-practices",
	]);
});
