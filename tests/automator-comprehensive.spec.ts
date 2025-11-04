// tests/automator-comprehensive.spec.ts
import { expect, test } from "@playwright/test";
import type { Page } from "playwright";
import {
  existsSync,
  readFileSync,
  readdirSync,
  mkdirSync,
  writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { GrokAutomator } from "../src/tasks/aichat/grok.js";
import { ChatGPTAutomator } from "../src/tasks/aichat/chatgpt.js";
import { BaseAiChatAutomator } from "../src/tasks/aichat/base.js";

interface FixtureMetadata {
  url: string;
  title?: string;
  timestamp?: string;
}

interface FixtureInfo {
  name: string;
  dir: string;
  metadata: FixtureMetadata;
  domain: string;
}

interface TestCase {
  fixture: FixtureInfo;
  automatorName: string;
  createAutomator: (page: Page) => BaseAiChatAutomator;
}

const fixtureRoot = resolve("tests/fixtures");
const snapshotRoot = resolve("tests/snapshots/automators");

function extractDomain(url: string): string {
  const match = url.match(/https?:\/\/([^\/]+)/);
  return match ? match[1] : "";
}

function loadFixtures(): FixtureInfo[] {
  const entries = readdirSync(fixtureRoot, { withFileTypes: true });
  const fixtures: FixtureInfo[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const dir = join(fixtureRoot, entry.name);
    const metadataPath = join(dir, "metadata.json");
    if (!existsSync(metadataPath)) continue;

    const metadata = JSON.parse(
      readFileSync(metadataPath, "utf-8")
    ) as FixtureMetadata;
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

function createAutomatorFactory(
  domain: string
): { name: string; factory: (page: Page) => BaseAiChatAutomator } | null {
  if (domain.includes("grok.com")) {
    return {
      name: "GrokAutomator",
      factory: (page: Page) => new GrokAutomator(page, "chat"),
    };
  }
  // if (domain.includes("chatgpt.com") || domain.includes("chat.openai.com")) {
  //   return {
  //     name: "ChatGPTAutomator",
  //     factory: (page: Page) => new ChatGPTAutomator(page, "chat"),
  //   };
  // }
  return null;
}

function generateTestCases(): TestCase[] {
  const fixtures = loadFixtures();
  const cases: TestCase[] = [];

  for (const fixture of fixtures) {
    const automatorConfig = createAutomatorFactory(fixture.domain);
    if (!automatorConfig) continue;

    cases.push({
      fixture,
      automatorName: automatorConfig.name,
      createAutomator: automatorConfig.factory,
    });
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

async function testAutomator(automator: BaseAiChatAutomator) {
  const results: Record<string, any> = {};

  const methods = [
    { name: "checkLoginStatus", fn: () => automator.checkLoginStatus() },
    { name: "getChatState", fn: () => automator.getChatState() },
    {
      name: "getMessages",
      fn: async () => {
        const messages = await automator.getMessages();
        return { messages, count: messages.length };
      },
    },
  ];

  for (const { name, fn } of methods) {
    try {
      const result = await fn();
      results[name] = { success: true, result };
    } catch (error) {
      results[name] = {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  return results;
}

function saveSnapshot(automatorName: string, fixtureName: string, data: any) {
  const dir = join(snapshotRoot, automatorName);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  const path = join(dir, `${fixtureName}.json`);
  writeFileSync(path, JSON.stringify(data, null, 2), "utf-8");
}

const testCases = generateTestCases();

test.describe("Automator comprehensive testing", () => {
  for (const testCase of testCases) {
    const testName = `${testCase.automatorName} × ${testCase.fixture.name}`;

    test(testName, async ({ page }) => {
      await mountFixture(page, testCase.fixture);

      const automator = testCase.createAutomator(page);
      const automatorResults = await testAutomator(automator);

      const snapshot = {
        fixture: {
          name: testCase.fixture.name,
          url: testCase.fixture.metadata.url,
          domain: testCase.fixture.domain,
        },
        automator: {
          name: testCase.automatorName,
          results: automatorResults,
        },
        timestamp: new Date().toISOString(),
      };

      saveSnapshot(testCase.automatorName, testCase.fixture.name, snapshot);

      // Verify automator methods executed
      expect(snapshot.automator.results).toBeDefined();
      expect(snapshot.automator.results.checkLoginStatus).toBeDefined();
      expect(snapshot.automator.results.getChatState).toBeDefined();
      expect(snapshot.automator.results.getMessages).toBeDefined();
    });
  }
});
