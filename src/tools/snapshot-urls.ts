// src/tools/snapshot-urls.ts
// Run with: npx tsx src/tools/snapshot-urls.ts <url1> [url2] [url3] ...

import * as fs from "node:fs";
import * as path from "node:path";
import * as yaml from "js-yaml";
import { chromium, type Page } from "playwright";

declare module "playwright" {
  interface Page {
    _snapshotForAI(): Promise<string>;
  }
}

const OUTPUT_DIR = path.join(process.cwd(), "output");
const DEFAULT_USER_DATA_DIR = path.join(
  process.cwd(),
  ".playwright-chrome-profile"
);

async function captureSnapshot(page: Page, url: string): Promise<string> {
  console.log(`Navigating to ${url}...`);
  await page.goto(url, { waitUntil: "domcontentloaded" });

  // Wait for page to settle
  try {
    await page.waitForLoadState("networkidle", { timeout: 10000 });
  } catch {
    console.log("Warning: Page did not reach networkidle state, continuing...");
  }

  // Additional wait for rendering
  await page.waitForTimeout(2000);

  // Get page metadata
  const title = await page.title();
  const pageUrl = page.url();

  // Extract related links
  const links = await page.evaluate(() => {
    const anchors = Array.from(document.querySelectorAll("a[href]"));
    return anchors
      .map((a) => ({
        text: (a.textContent || "").trim(),
        url: (a as HTMLAnchorElement).href,
      }))
      .filter((link) => link.url.startsWith("http") && link.text.length > 0);
  });

  // Generate filename and path
  const now = new Date();
  const date = now.toISOString().split("T")[0]; // YYYY-MM-DD
  const timestamp = Date.now();
  const domain = new URL(url).hostname.replace(/^www\./, "");
  const filename = `${domain}_${timestamp}.md`;
  const dirPath = path.join(OUTPUT_DIR, date as string);
  const filepath = path.join(dirPath, filename);

  // Capture AI snapshot
  const aiSnapshot = await page._snapshotForAI();

  // Create frontmatter with metadata
  const frontmatter = `---
title: "${title.replace(/"/g, '\\"')}"
url: "${pageUrl}"
domain: "${domain}"
capturedAt: "${now.toISOString()}"
---

`;

  // Save to file
  fs.mkdirSync(dirPath, { recursive: true });
  fs.writeFileSync(filepath, frontmatter + aiSnapshot);

  // Save YAML
  const yamlData = {
    meta: {
      title,
      url: pageUrl,
      domain,
      capturedAt: now.toISOString(),
    },
    links,
  };
  const yamlFilepath = filepath.replace(/\.md$/, ".yaml");
  fs.writeFileSync(yamlFilepath, yaml.dump(yamlData));

  console.log(`Saved: ${filepath}`);
  console.log(`Saved: ${yamlFilepath}`);
  return filepath;
}

async function main() {
  const urls = process.argv.slice(2);

  if (urls.length === 0) {
    console.log("Usage: npx tsx src/tools/snapshot-urls.ts <url1> [url2] ...");
    console.log("Example: npx tsx src/tools/snapshot-urls.ts https://google.com");
    process.exit(1);
  }

  console.log(`Launching browser (headless: false)...`);
  const context = await chromium.launchPersistentContext(DEFAULT_USER_DATA_DIR, {
    headless: false,
    channel: "chrome",
    args: ["--disable-blink-features=AutomationControlled"],
  });

  const page = context.pages()[0] ?? (await context.newPage());

  try {
    for (const url of urls) {
      await captureSnapshot(page, url);
    }
    console.log(`\nDone! Saved ${urls.length} snapshot(s) to ${OUTPUT_DIR}`);
  } finally {
    await context.close();
  }
}

main();
