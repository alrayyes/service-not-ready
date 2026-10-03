import { ready, start, stop } from "../test/container";
import { capture } from "../test/screenshot";

// Usage: bun scripts/screenshot.ts [file]. Shoots IMAGE (default: service-not-ready:test,
// so build it first), the same image the tests run.
const file = process.argv[2] ?? "screenshot.png";
const c = start();
try {
	await ready(c.url);
	await capture(c.url, file);
	console.log(`wrote ${file}`);
} finally {
	stop(c.name);
}
