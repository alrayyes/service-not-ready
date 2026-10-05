import { afterAll, beforeAll, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const root = new URL("..", import.meta.url).pathname;
// Fixtures live outside the repo, so the repo-wide runs never see them; the tools get the
// repo's own configs explicitly.
let dir = "";

beforeAll(() => {
	dir = mkdtempSync(join(tmpdir(), "snr-md-"));
});
afterAll(() => rmSync(dir, { recursive: true, force: true }));

const prettier = (file: string) =>
	run("bunx", "prettier", "--config", ".prettierrc", "--check", file);
const markdownlint = (file: string) =>
	run("bunx", "markdownlint-cli2", "--config", ".markdownlint-cli2.yaml", file);

function run(...cmd: string[]) {
	const r = Bun.spawnSync(cmd, { cwd: root, stdout: "pipe", stderr: "pipe" });
	return { code: r.exitCode, out: r.stdout.toString() + r.stderr.toString() };
}

function fixture(name: string, text: string) {
	const file = `${dir}/${name}`;
	writeFileSync(file, text);
	return file;
}

test("an unformatted table fails prettier --check", () => {
	const file = fixture("table.md", "# T\n\n| a | b |\n|--|--|\n| long cell here | x |\n");
	expect(prettier(file).code).not.toBe(0);
});

test("a formatted table passes prettier --check", () => {
	const file = fixture(
		"table-ok.md",
		"# T\n\n| a              | b   |\n| -------------- | --- |\n| long cell here | x   |\n",
	);
	expect(prettier(file).code).toBe(0);
});

// The alias override: `extends` merges on the literal key, so MD013 would sit beside the
// inherited `line-length: false` and lose. A short-prose repo passes either way, so prove
// it with a line over the limit.
test("a line over the limit fails markdownlint with line-length", () => {
	const file = fixture("long.md", `# T\n\n${"word ".repeat(200).trim()}\n`);
	const r = markdownlint(file);
	expect(r.code).not.toBe(0);
	expect(r.out).toContain("MD013/line-length");
});

test("a skipped heading level fails markdownlint", () => {
	const file = fixture("heading.md", "# T\n\n### Skipped\n");
	expect(markdownlint(file).code).not.toBe(0);
});
