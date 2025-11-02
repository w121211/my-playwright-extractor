// tests/chatgpt-fixtures.spec.ts
import { expect, test } from "@playwright/test";
import type { Page } from "playwright";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { extractFrom, resolveLocator } from "../src/extractor.js";
import type { AiAssistantPageSpec } from "../src/types.js";
import { ChatGPTAutomator } from "../src/tasks/aichat/chatgpt.js";
import chatgptSpec from "./selectors/chatgpt-selectors-1031.json" with { type: "json" };

interface FixtureMetadata {
  url: string;
}

interface FixtureExtraction {
  messages?: unknown[];
}

interface FixtureInfo {
  name: string;
  dir: string;
  metadata: FixtureMetadata;
  extraction: FixtureExtraction;
  pageName: "landing" | "chat";
  pageSpec: AiAssistantPageSpec;
}

const fixtureRoot = resolve("tests/fixtures");

function loadFixtures(): FixtureInfo[] {
  const siteSpec = chatgptSpec;
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
    if (!metadata.url.includes("chatgpt.com")) continue;

    const extractionPath = join(dir, "extraction.result.json");
    const extraction = existsSync(extractionPath)
      ? (JSON.parse(readFileSync(extractionPath, "utf-8")) as FixtureExtraction)
      : { messages: [] };

    const pageName = metadata.url.includes("/c/") ? "chat" : "landing";
    const pageSpec = siteSpec.pages[pageName];

    fixtures.push({
      name: entry.name,
      dir,
      metadata,
      extraction,
      pageName,
      pageSpec,
    });
  }

  return fixtures;
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

function isRequiredElement(
  key: string,
  pageName: FixtureInfo["pageName"]
): boolean {
  const shared = new Set([
    "loginIndicator",
    "newChatButton",
    "recentChatLinks",
    "messageInputArea",
    "messageSubmitButton",
  ]);

  if (pageName === "landing") {
    return shared.has(key);
  }

  if (pageName === "chat") {
    return shared.has(key) || key === "messageBlocks";
  }

  return false;
}

const fixtures = loadFixtures();
const chatFixtures = fixtures.filter((fixture) => fixture.pageName === "chat");

test.describe("ChatGPT fixture coverage", () => {
  test.describe("selectors", () => {
    for (const fixture of fixtures) {
      test(`${fixture.name} selectors resolve`, async ({ page }) => {
        await mountFixture(page, fixture);
        const elements = fixture.pageSpec.elements ?? {};

        for (const [key, def] of Object.entries(elements)) {
          await test.step(`selector: ${key}`, async () => {
            const locator = await resolveLocator(page, def.selector);
            const count = await locator.count();
            if (isRequiredElement(key, fixture.pageName)) {
              expect(count, `${key} should match nodes`).toBeGreaterThan(0);
            }
            if (def.fields) {
              const extracted = (await extractFrom(page, def)) as Array<
                Record<string, unknown>
              >;
              expect(Array.isArray(extracted)).toBe(true);
              if (extracted.length > 0) {
                const first = extracted[0];
                for (const fieldKey of Object.keys(def.fields)) {
                  expect(first).toHaveProperty(fieldKey);
                }
              }
            }
          });
        }
      });
    }
  });

  test.describe("automator behaviour", () => {
    const fixture = chatFixtures[0]!;

    test.beforeEach(async ({ page }) => {
      await mountFixture(page, fixture);
    });

    test("login helpers reflect indicator visibility", async ({ page }) => {
      const automator = new ChatGPTAutomator(page, "chat");

      expect(await automator.checkLoginStatus()).toBe(true);

      await page.evaluate(() => {
        const indicator = document.querySelector(
          "[data-testid='accounts-profile-button']"
        ) as HTMLElement | null;
        indicator?.classList.add("hidden");
        setTimeout(() => indicator?.classList.remove("hidden"), 50);
      });

      const waitPromise = automator.waitForLogin(500);
      await expect(waitPromise).resolves.toBeUndefined();

      await page.evaluate(() => {
        const indicator = document.querySelector(
          "[data-testid='accounts-profile-button']"
        );
        indicator?.remove();
      });

      expect(await automator.checkLoginStatus()).toBe(false);
    });

    test("new chat and chat navigation trigger expected clicks", async ({
      page,
    }) => {
      const automator = new ChatGPTAutomator(page, "chat");

      await page.evaluate(() => {
        const newChat = document.querySelector(
          "[data-testid='create-new-chat-button']"
        );
        newChat?.setAttribute("data-clicked", "false");
      });

      await automator.startNewChat();

      expect(
        await page
          .locator("[data-testid='create-new-chat-button']")
          .getAttribute("data-clicked")
      ).toBe("true");

      await page.evaluate(() => {
        document
          .querySelectorAll("a[href^='/c/']")
          .forEach((anchor) => anchor.setAttribute("data-clicked", "false"));
      });

      await automator.openChat(1);

      expect(
        await page.locator("a[href^='/c/']").nth(1).getAttribute("data-clicked")
      ).toBe("true");
    });

    test("send message pipeline fills input and submits form", async ({
      page,
    }) => {
      const automator = new ChatGPTAutomator(page, "chat");
      const sampleText = "Offline test message";

      await automator.sendMessage(sampleText);

      await expect(page.locator("#prompt-textarea")).toHaveValue(sampleText);
      expect(await page.locator("form").getAttribute("data-submitted")).toBe(
        "true"
      );
    });

    test("response wait and chat state resolve correctly", async ({ page }) => {
      const automator = new ChatGPTAutomator(page, "chat");

      await page.evaluate(() => {
        const indicator = document.querySelector(
          "[role='progressbar']"
        ) as HTMLElement | null;
        if (indicator) {
          indicator.classList.remove("hidden");
          setTimeout(() => indicator.remove(), 50);
        }
      });

      await automator.waitForResponse(500);

      expect(await automator.getChatState()).toBe("idle");

      await page.evaluate(() => {
        const indicator = document.createElement("div");
        indicator.setAttribute("role", "progressbar");
        document.querySelector("main")?.appendChild(indicator);
      });

      expect(await automator.getChatState()).toBe("generating");

      await page.evaluate(() => {
        document.querySelector("[role='progressbar']")?.remove();
      });

      expect(await automator.getChatState()).toBe("idle");
    });

    test("messages extraction matches fixture snapshot", async ({ page }) => {
      const automator = new ChatGPTAutomator(page, "chat");
      const messages = (await automator.getMessages()) as unknown[];

      expect(messages).toEqual(fixture.extraction.messages ?? []);

      const serialized = JSON.stringify(messages, null, 2);
      expect(serialized).toMatchSnapshot(`${fixture.name}-messages.json`);
    });
  });
});
