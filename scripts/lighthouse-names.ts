// Renames the files Lighthouse CI wrote to stable names and points manifest.json at them.
// LHCI stamps every file with the time of the run, so each deploy would rename all of them
// and a manifest the CDN still holds would link to files that are gone.
// Usage: bun scripts/lighthouse-names.ts <lighthouse reports dir>
import { existsSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";

interface Entry {
	url: string;
	isRepresentativeRun?: boolean;
	htmlPath: string;
	jsonPath: string;
}

// "http://localhost/a/b.html" -> "a-b", "http://localhost/" -> "index".
export function pageName(url: string): string {
	const path = new URL(url).pathname.replace(/\.html?$/, "");
	return path.replace(/^\/+|\/+$/g, "").replace(/[^a-zA-Z0-9]+/g, "-") || "index";
}

const base = (path: string) => path.split("/").pop() as string;

// The representative run takes `<page>.report.*`; the others become `<page>-2`, `<page>-3`.
export function stabilizeReports(dir: string): void {
	const manifestPath = join(dir, "manifest.json");
	const entries = JSON.parse(readFileSync(manifestPath, "utf8")) as Entry[];
	const seen = new Map<string, number>();
	const ordered = [...entries].sort(
		(a, b) => Number(b.isRepresentativeRun ?? false) - Number(a.isRepresentativeRun ?? false),
	);
	for (const entry of ordered) {
		const page = pageName(entry.url);
		const n = (seen.get(page) ?? 0) + 1;
		seen.set(page, n);
		const stem = n === 1 ? page : `${page}-${n}`;
		for (const key of ["htmlPath", "jsonPath"] as const) {
			const ext = key === "htmlPath" ? "html" : "json";
			const name = `${stem}.report.${ext}`;
			const from = join(dir, base(entry[key]));
			if (from !== join(dir, name)) {
				if (!existsSync(from)) throw new Error(`manifest names ${from}, which does not exist`);
				renameSync(from, join(dir, name));
			}
			const parent = dirname(entry[key]);
			entry[key] = parent === "." ? name : `${parent}/${name}`;
		}
	}
	writeFileSync(manifestPath, `${JSON.stringify(entries, null, 2)}\n`);
}

if (import.meta.main) {
	const dir = process.argv[2];
	if (!dir || !existsSync(join(dir, "manifest.json"))) {
		console.error("usage: bun scripts/lighthouse-names.ts <lighthouse reports dir>");
		process.exit(1);
	}
	stabilizeReports(dir);
}
