import { join } from "node:path";
import { chromium } from "@playwright/test";

// Every page the image serves at /<name>.html, in the order the README shows them.
export const NAMES = ["401", "403", "404", "429", "500", "502", "503", "504", "error"];

export const shotName = (name: string) => `screenshot-${name}.png`;

// The README and every release use these shots, so they are taken the same way each time:
// fixed size, dark scheme, reduced motion so the neon animation can't change the pixels.
export async function captureAll(base: string, dir: string): Promise<string[]> {
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage({
			viewport: { width: 1000, height: 640 },
			colorScheme: "dark",
			reducedMotion: "reduce",
		});
		const files: string[] = [];
		for (const name of NAMES) {
			const file = join(dir, shotName(name));
			await page.goto(`${base}/${name}.html`);
			await page.locator("#status").waitFor();
			await page.screenshot({ path: file });
			files.push(file);
		}
		return files;
	} finally {
		await browser.close();
	}
}
