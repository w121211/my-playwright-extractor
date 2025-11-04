// src/tools/record-fixture.ts
// Run with: npx tsx src/tools/record-fixture.ts

import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";
import { chromium, type Page, type BrowserContext } from "playwright";

declare module "playwright" {
  interface Page {
    _snapshotForAI(): Promise<string>;
  }
}

const FIXTURES_DIR = path.join(__dirname, "..", "..", "tests", "fixtures");
const DEFAULT_WORKSPACE_USER_DATA_DIR = path.join(
  process.cwd(),
  ".playwright-chrome-profile"
);

interface CliOptions {
  readonly userDataDir: string | null;
  readonly description: string;
}

function parseCliOptions(args: string[]): CliOptions {
  const profilePathArg = args.find((arg) => arg.startsWith("--profile-path="));

  if (profilePathArg !== undefined) {
    const profilePath = profilePathArg.slice("--profile-path=".length);
    if (profilePath.length === 0) {
      throw new Error("Provided --profile-path value cannot be empty.");
    }

    return {
      userDataDir: path.resolve(profilePath),
      description: "custom Chrome profile path",
    };
  }

  // if (args.includes('--profile')) {
  //   return {
  //     userDataDir: getDefaultChromeUserDataDir(),
  //     description: 'system Chrome profile',
  //   };
  // }

  return {
    userDataDir: DEFAULT_WORKSPACE_USER_DATA_DIR,
    description: "workspace Chrome profile",
  };
}

async function saveFixture(page: Page) {
  const url = page.url();
  if (url === "about:blank") {
    return;
  }

  console.log(`Saving fixture for ${url}`);

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const domain = new URL(url).hostname.replace(/www\./g, "");
  const fixtureDir = path.join(FIXTURES_DIR, `${timestamp}-${domain}`);

  fs.mkdirSync(fixtureDir, { recursive: true });

  // Save metadata
  const title = await page.title();
  const viewport = page.viewportSize();
  const userAgent = await page.evaluate<string>("navigator.userAgent");
  const metadata = {
    url,
    title,
    timestamp: new Date().toISOString(),
    viewport,
    userAgent,
  };
  fs.writeFileSync(
    path.join(fixtureDir, "metadata.json"),
    JSON.stringify(metadata, null, 2)
  );

  // Wait for page to be fully loaded and idle before capturing HTML
  // Use longer timeout and fallback if networkidle is never reached
  try {
    await page.waitForLoadState("networkidle", { timeout: 10000 });
  } catch (error) {
    // Some pages never reach networkidle state, continue anyway
    console.log("Warning: Page did not reach networkidle state, continuing...");
  }

  // Additional wait for any deferred rendering or animations
  await page.waitForTimeout(2000);

  // Get fully rendered HTML after JavaScript execution, stripped of scripts/styles
  const html = (await page.evaluate((() => {
    // Clone the document to avoid modifying the live page
    const clone = document.documentElement.cloneNode(true) as HTMLElement;

    // Remove script, style, noscript, and stylesheet link tags
    clone
      .querySelectorAll('script, style, noscript, link[rel="stylesheet"]')
      .forEach((el) => el.remove());

    // Remove inline styles and event handler attributes
    clone.querySelectorAll("*").forEach((el) => {
      // Remove style attribute
      el.removeAttribute("style");

      // Remove all on* event attributes (onclick, onload, etc.)
      Array.from(el.attributes).forEach((attr) => {
        if (attr.name.startsWith("on")) {
          el.removeAttribute(attr.name);
        }
      });
    });

    // Optional: Truncate long text nodes to reduce size
    const truncateTextNodes = (node: Node) => {
      if (node.nodeType === Node.TEXT_NODE && node.textContent) {
        if (node.textContent.length > 200) {
          node.textContent = node.textContent.substring(0, 200) + "...";
        }
      } else {
        node.childNodes.forEach(truncateTextNodes);
      }
    };
    truncateTextNodes(clone);

    return clone.outerHTML;
  }) as any)) as string;
  fs.writeFileSync(path.join(fixtureDir, "source.html"), html);

  // const ariaSnapshot = await page.locator("body").ariaSnapshot();
  // fs.writeFileSync(path.join(fixtureDir, "snapshot.yaml"), ariaSnapshot);

  const aiSnapshot = await page._snapshotForAI();
  fs.writeFileSync(path.join(fixtureDir, "ai-snapshot.yaml"), aiSnapshot);

  console.log(`Saved fixture for ${url} to ${fixtureDir}`);
}

async function main() {
  const args = process.argv.slice(2);
  const { userDataDir, description } = parseCliOptions(args);
  const mitigationArgs: string[] = [
    "--disable-blink-features=AutomationControlled",
  ];
  // const ignoredDefaultArgs: string[] = ['--enable-automation'];

  let context: BrowserContext;
  let page: Page;

  if (userDataDir === null) {
    throw new Error("Need `userDataDir` to persist login state");
  }

  console.log(`Launching Chrome with ${description}: ${userDataDir}`);
  context = await chromium.launchPersistentContext(userDataDir, {
    headless: false,
    channel: "chrome",
    args: mitigationArgs,
    // ignoreDefaultArgs: ignoredDefaultArgs,
  });

  // Anti-bot detection mitigation (commented out - uncomment if needed)
  // These scripts hide automation by overriding navigator.webdriver property
  // Websites check navigator.webdriver to detect if browser is automated
  // Uncomment if target sites block or behave differently with Playwright

  // Override navigator.webdriver for all new pages
  // await context.addInitScript(() => {
  //   // eslint-disable-next-line @typescript-eslint/no-explicit-any
  //   Object.defineProperty((globalThis as any).navigator, "webdriver", {
  //     get() {
  //       return undefined;
  //     },
  //   });
  // });

  // Apply the same override to any existing pages in the persistent context
  // const existingPages = context.pages();
  // if (existingPages.length > 0) {
  //   await Promise.all(
  //     existingPages.map(async (existingPage) => {
  //       await existingPage.evaluate(() => {
  //         // eslint-disable-next-line @typescript-eslint/no-explicit-any
  //         Object.defineProperty((globalThis as any).navigator, "webdriver", {
  //           get() {
  //             return undefined;
  //           },
  //         });
  //       });
  //     })
  //   );
  // }

  page = context.pages()[0] ?? (await context.newPage());

  page.on("load", async () => {
    await saveFixture(page);
  });

  console.log("Browser opened. Navigate to a page to start saving fixtures.");
  console.log(
    'Press "s" to save a fixture manually. Close the browser to exit.'
  );
  console.log(
    `Persistent Chrome profile active at ${userDataDir} — complete login once and reuse this session.`
  );

  readline.emitKeypressEvents(process.stdin);
  if (process.stdin.isTTY) {
    process.stdin.setRawMode(true);
  }
  process.stdin.on("keypress", async (_str: string, key: readline.Key) => {
    if (key.name === "s") {
      await saveFixture(page);
    }
    if (key.ctrl && key.name === "c") {
      process.exit();
    }
  });

  await page.goto("about:blank");
}

main();
