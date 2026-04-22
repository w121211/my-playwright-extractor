// tests/snapshot-urls.spec.ts
import * as fs from "node:fs";
import * as path from "node:path";
import { expect, test } from "@playwright/test";
import type { Page } from "playwright";

declare module "playwright" {
  interface Page {
    _snapshotForAI(): Promise<string>;
  }
}

const OUTPUT_DIR = path.join(process.cwd(), "output");

async function captureSnapshot(page: Page, url: string): Promise<string> {
  await page.goto(url, { waitUntil: "domcontentloaded" });

  try {
    await page.waitForLoadState("networkidle", { timeout: 10000 });
  } catch {
    // Continue if networkidle not reached
  }

  await page.waitForTimeout(1000);

  const today = new Date().toISOString().split("T")[0];
  const timestamp = Date.now();
  const domain = new URL(url).hostname.replace(/^www\./, "");
  const filename = `${today}-${domain}-${timestamp}.yaml`;
  const filepath = path.join(OUTPUT_DIR, filename);

  const aiSnapshot = await page._snapshotForAI();

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  fs.writeFileSync(filepath, aiSnapshot);

  return filepath;
}

test.describe("Snapshot URLs", () => {
  test("captures snapshot from a URL", async ({ page }) => {
    const url = "https://example.com";

    const filepath = await captureSnapshot(page, url);

    // Verify file was created
    expect(fs.existsSync(filepath)).toBe(true);

    // Verify file contains content
    const content = fs.readFileSync(filepath, "utf-8");
    expect(content.length).toBeGreaterThan(0);

    // Verify filename format
    const filename = path.basename(filepath);
    expect(filename).toMatch(/^\d{4}-\d{2}-\d{2}-example\.com-\d+\.yaml$/);

    // Cleanup
    fs.unlinkSync(filepath);
  });

  test("captures snapshots from multiple URLs", async ({ page }) => {
    const urls = ["https://example.com", "https://example.org"];
    const filepaths: string[] = [];

    for (const url of urls) {
      const filepath = await captureSnapshot(page, url);
      filepaths.push(filepath);
    }

    // Verify all files created
    expect(filepaths.length).toBe(2);
    for (const filepath of filepaths) {
      expect(fs.existsSync(filepath)).toBe(true);
      fs.unlinkSync(filepath);
    }
  });
});
