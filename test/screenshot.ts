import { chromium } from "@playwright/test";

// The README and every release use this shot, so it is taken the same way each time:
// fixed size, dark scheme, reduced motion so the neon animation can't change the pixels.
export async function capture(url: string, file: string) {
	const browser = await chromium.launch();
	try {
		const page = await browser.newPage({
			viewport: { width: 1000, height: 640 },
			colorScheme: "dark",
			reducedMotion: "reduce",
		});
		await page.goto(url);
		await page.locator("#status").waitFor();
		await page.screenshot({ path: file });
	} finally {
		await browser.close();
	}
}
