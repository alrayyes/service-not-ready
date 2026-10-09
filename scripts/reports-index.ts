// Writes site/reports/index.html, a page listing each report the CI run produced, with the
// commit and the date. Usage: bun scripts/reports-index.ts <reports dir>
import { existsSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

interface Meta {
	sha: string;
	date: string;
}

const escapeHtml = (text: string) =>
	text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export function renderIndex(files: string[], { sha, date }: Meta): string {
	const items = files
		.map((file) => `<li><a href="${escapeHtml(file)}">${escapeHtml(file)}</a></li>`)
		.join("\n\t\t");
	const note = files.some((file) => file.startsWith("coverage/"))
		? "<p>Coverage measures only the unit tests of the tooling (<code>bun test ./ci</code>). The Playwright tests drive a container, so they have no line coverage.</p>"
		: "";
	return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>service-not-ready reports</title>
<style>:root{color-scheme:light dark}body{font:1rem/1.5 system-ui,sans-serif;max-width:40rem;margin:2rem auto;padding:0 1rem}</style>
</head>
<body>
<h1>service-not-ready reports</h1>
<p>Commit <code>${escapeHtml(sha.slice(0, 7))}</code>, ${escapeHtml(date)}.</p>
<ul>
\t\t${items}
</ul>
${note}
</body>
</html>
`;
}

// Every file under `dir`, as paths relative to it, sorted.
function walk(dir: string, prefix = ""): string[] {
	return readdirSync(dir)
		.sort()
		.flatMap((name) => {
			const full = join(dir, name);
			const rel = prefix ? `${prefix}/${name}` : name;
			return statSync(full).isDirectory() ? walk(full, rel) : [rel];
		});
}

// The entry points worth a link: the JUnit and coverage files, and each HTML view's index.
const LISTED =
	/^(tests\/.*\.xml|tests\/playwright\/index\.html|coverage\/(index\.html|coverage\.xml|lcov\.info))$/;

if (import.meta.main) {
	const dir = process.argv[2];
	if (!dir || !existsSync(dir)) {
		console.error("usage: bun scripts/reports-index.ts <reports dir>");
		process.exit(1);
	}
	const files = walk(dir).filter((file) => LISTED.test(file));
	const html = renderIndex(files, {
		sha: process.env.GITHUB_SHA ?? "unknown",
		date: new Date().toISOString().slice(0, 10),
	});
	writeFileSync(join(dir, "index.html"), html);
}
