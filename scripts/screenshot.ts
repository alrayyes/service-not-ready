import { mkdirSync } from "node:fs";
import { ready, start, stop } from "../test/container";
import { captureAll } from "../test/screenshot";

// Usage: bun scripts/screenshot.ts [dir]. Shoots every page of IMAGE (default:
// service-not-ready:test, so build it first), the same image the tests run, into
// screenshot-<name>.png files.
const dir = process.argv[2] ?? ".";
mkdirSync(dir, { recursive: true });
const c = start();
try {
	await ready(c.url);
	for (const file of await captureAll(c.url, dir)) console.log(`wrote ${file}`);
} finally {
	stop(c.name);
}
