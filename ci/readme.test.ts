import { expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";

const readme = readFileSync(new URL("../README.md", import.meta.url), "utf8");
const [title, ...rest] = readme.split("\n");
const opening = rest.slice(0, 6).join("\n");
const repo = "alrayyes/service-not-ready";

test("the README opens with a CI badge for a workflow that exists", () => {
	expect(title).toBe("# service-not-ready");
	const match = opening.match(
		new RegExp(`github\\.com/${repo}/actions/workflows/([\\w.-]+)/badge\\.svg`),
	);
	expect(match, "no CI badge").not.toBeNull();
	expect(existsSync(new URL(`../.github/workflows/${match?.[1]}`, import.meta.url))).toBe(true);
});

test("the README opens with release and licence badges", () => {
	expect(opening).toContain(`img.shields.io/github/v/release/${repo}`);
	expect(opening).toContain(`img.shields.io/github/license/${repo}`);
});

test("the Codecov badge follows the CI badge", () => {
	const lines = opening.split("\n").filter((l) => l.startsWith("[!["));
	expect(lines[0]).toContain("badge.svg?branch=main");
	expect(lines[1]).toContain(`codecov.io/gh/${repo}/graph/badge.svg`);
	expect(lines[1]).not.toContain("token=");
});
