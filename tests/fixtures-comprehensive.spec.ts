// tests/fixtures-comprehensive.spec.ts
import { expect, test } from "@playwright/test";
import type { Page } from "playwright";
import { existsSync, readFileSync, readdirSync, mkdirSync, writeFileSync } from "node:fs";
import { join, resolve, basename } from "node:path";
import { extractFrom, resolveLocator } from "../src/extractor.js";
import type { AiAssistantSiteSpec, AiAssistantPageSpec, SelectorDef } from "../src/types.js";
import { BaseAiChatAutomator } from "../src/tasks/aichat/base.js";

interface FixtureMetadata {
  url: string;
  title?: string;
  timestamp?: string;
}

interface SelectorSpec {
  path: string;
  basename: string;
  domain: string;
  spec: AiAssistantSiteSpec;
}

interface FixtureInfo {
  name: string;
  dir: string;
  metadata: FixtureMetadata;
  domain: string;
}

interface TestCase {
  fixture: FixtureInfo;
  selector: SelectorSpec;
  pageName: string;
  pageSpec: AiAssistantPageSpec;
}

const fixtureRoot = resolve("tests/fixtures");
const selectorRoot = resolve("tests/selectors");
const snapshotRoot = resolve("tests/snapshots");

function extractDomain(url: string): string {
  const match = url.match(/https?:\/\/([^\/]+)/);
  return match ? match[1] : "";
}

function loadSelectorSpecs(): SelectorSpec[] {
  const files = readdirSync(selectorRoot).filter((f) => f.endsWith(".json"));
  return files.map((file) => {
    const path = join(selectorRoot, file);
    const spec = JSON.parse(readFileSync(path, "utf-8")) as AiAssistantSiteSpec;
    const domain = extractDomainFromSpec(spec);
    return {
      path,
      basename: file.replace(".json", ""),
      domain,
      spec,
    };
  });
}

function extractDomainFromSpec(spec: AiAssistantSiteSpec): string {
  for (const page of Object.values(spec.pages)) {
    if (page.urlGlob) {
      const globs = Array.isArray(page.urlGlob) ? page.urlGlob : [page.urlGlob];
      for (const glob of globs) {
        const domain = extractDomain(glob);
        if (domain) return domain;
      }
    }
  }
  return "";
}

function loadFixtures(): FixtureInfo[] {
  const entries = readdirSync(fixtureRoot, { withFileTypes: true });
  const fixtures: FixtureInfo[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dir = join(fixtureRoot, entry.name);
    const metadataPath = join(dir, "metadata.json");
    if (!existsSync(metadataPath)) continue;

    const metadata = JSON.parse(readFileSync(metadataPath, "utf-8")) as FixtureMetadata;
    const domain = extractDomain(metadata.url);

    fixtures.push({
      name: entry.name,
      dir,
      metadata,
      domain,
    });
  }

  return fixtures;
}

function matchPageSpec(url: string, spec: AiAssistantSiteSpec): string | null {
  for (const [pageName, pageSpec] of Object.entries(spec.pages)) {
    if (!pageSpec.urlGlob) continue;
    const globs = Array.isArray(pageSpec.urlGlob) ? pageSpec.urlGlob : [pageSpec.urlGlob];
    for (const glob of globs) {
      if (matchGlob(url, glob)) {
        return pageName;
      }
    }
  }
  return null;
}

function matchGlob(url: string, glob: string): boolean {
  const pattern = glob
    .replace(/\*\*/g, ".*")
    .replace(/\*/g, "[^/]*")
    .replace(/\?/g, ".");
  const regex = new RegExp(`^${pattern}$`);
  return regex.test(url);
}

function generateTestCases(): TestCase[] {
  const fixtures = loadFixtures();
  const selectors = loadSelectorSpecs();
  const cases: TestCase[] = [];

  for (const fixture of fixtures) {
    for (const selector of selectors) {
      if (fixture.domain !== selector.domain) continue;
      const pageName = matchPageSpec(fixture.metadata.url, selector.spec);
      if (!pageName) continue;
      const pageSpec = selector.spec.pages[pageName];
      cases.push({ fixture, selector, pageName, pageSpec });
    }
  }

  return cases;
}

async function mountFixture(page: Page, fixture: FixtureInfo) {
  const sourcePath = join(fixture.dir, "source.html");
  const html = readFileSync(sourcePath, "utf-8");
  await page.route(fixture.metadata.url, (route) => {
    route.fulfill({
      status: 200,
      contentType: "text/html",
      body: html,
    });
  });
  await page.goto(fixture.metadata.url);
}

function isCoreElement(key: string): boolean {
  const coreElements = new Set([
    "loginIndicator",
    "newChatButton",
    "recentChatLinks",
    "messageInputArea",
    "messageSubmitButton",
    "messageBlocks",
  ]);
  return coreElements.has(key);
}

async function testSelectors(page: Page, pageSpec: AiAssistantPageSpec) {
  const results: Record<string, any> = {};
  const elements = pageSpec.elements ?? {};

  for (const [key, def] of Object.entries(elements)) {
    const locator = await resolveLocator(page, def.selector);
    const count = await locator.count();

    const samples: string[] = [];
    const sampleCount = Math.min(count, 3);
    for (let i = 0; i < sampleCount; i++) {
      const text = await locator.nth(i).textContent();
      samples.push(text?.trim() ?? "");
    }

    const result: any = {
      selector: Array.isArray(def.selector) ? def.selector : [def.selector],
      count,
      samples,
    };

    if (def.fields) {
      const extracted = (await extractFrom(page, def)) as Array<Record<string, unknown>>;
      result.fields = extracted;
    }

    results[key] = result;

    // Only assert core elements must match
    // Optional elements (aiGeneratingIndicator, sidebarToggleButton, etc.) are allowed to have count = 0
    if (isCoreElement(key)) {
      expect(count, `Core selector "${key}" should match elements`).toBeGreaterThan(0);
    }
  }

  return results;
}

async function testAutomator(page: Page, pageSpec: AiAssistantPageSpec) {
  const automator = new BaseAiChatAutomator(page, pageSpec);
  const results: Record<string, any> = {};

  const methods = [
    { name: "checkLoginStatus", fn: () => automator.checkLoginStatus() },
    { name: "getChatState", fn: () => automator.getChatState() },
    { name: "getMessages", fn: async () => {
      const messages = await automator.getMessages();
      return { messages, count: messages.length };
    }},
  ];

  for (const { name, fn } of methods) {
    try {
      const result = await fn();
      results[name] = { success: true, result };
    } catch (error) {
      results[name] = {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  return results;
}

function saveSnapshot(selectorBasename: string, fixtureName: string, data: any) {
  const dir = join(snapshotRoot, selectorBasename);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const path = join(dir, `${fixtureName}.json`);
  writeFileSync(path, JSON.stringify(data, null, 2), "utf-8");
}

const testCases = generateTestCases();

test.describe("Comprehensive fixture testing", () => {
  test.describe("Selector and automator snapshots", () => {
    for (const testCase of testCases) {
      const testName = `${testCase.selector.basename} × ${testCase.fixture.name}`;

      test(testName, async ({ page }) => {
        await mountFixture(page, testCase.fixture);

        const selectorResults = await testSelectors(page, testCase.pageSpec);
        const automatorResults = await testAutomator(page, testCase.pageSpec);

        const snapshot = {
          fixture: {
            name: testCase.fixture.name,
            url: testCase.fixture.metadata.url,
          },
          selector: {
            file: `${testCase.selector.basename}.json`,
            version: testCase.selector.spec.version ?? "unknown",
          },
          page: testCase.pageName,
          selectors: selectorResults,
          automator: automatorResults,
        };

        saveSnapshot(testCase.selector.basename, testCase.fixture.name, snapshot);

        // Verify snapshot matches expected format
        expect(snapshot.selectors).toBeDefined();
        expect(snapshot.automator).toBeDefined();
      });
    }
  });
});
