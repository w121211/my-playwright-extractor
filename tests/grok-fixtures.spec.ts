// tests/grok-fixtures.spec.ts
import { expect, test } from "@playwright/test";
import type { Page } from "playwright";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join, resolve } from "node:path";
import { extractFrom, resolveLocator } from "../src/extractor.js";
import type { AiAssistantPageSpec, AiAssistantSiteSpec } from "../src/types.js";
import { GrokAutomator } from "../src/tasks/aichat/grok.js";
import grokSpecJson from "./selectors/grok-selectors-complete-1104.json" with { type: "json" };

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
const grokSpec: AiAssistantSiteSpec = grokSpecJson;

function loadFixtures(): FixtureInfo[] {
  const entries = readdirSync(fixtureRoot, { withFileTypes: true });
  const fixtures: FixtureInfo[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (!entry.name.endsWith("grok.com")) continue;

    const dir = join(fixtureRoot, entry.name);
    const metadataPath = join(dir, "metadata.json");
    if (!existsSync(metadataPath)) continue;

    const metadata = JSON.parse(
      readFileSync(metadataPath, "utf-8")
    ) as FixtureMetadata;

    if (!metadata.url.includes("grok.com")) continue;

    const extractionPath = join(dir, "extraction.result.json");
    const extraction = existsSync(extractionPath)
      ? (JSON.parse(readFileSync(extractionPath, "utf-8")) as FixtureExtraction)
      : { messages: [] };

    const pageName = metadata.url.includes("/c/") ? "chat" : "landing";
    const pageSpec = grokSpec.pages[pageName];

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

test.describe("Grok fixture coverage", () => {
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

    test("login helpers react to indicator visibility", async ({ page }) => {
      const automator = new GrokAutomator(page, "chat");

      expect(await automator.checkLoginStatus()).toBe(true);

      await page.evaluate(() => {
        const indicator = document.querySelector(
          "img[alt='pfp']"
        ) as HTMLElement | null;
        if (indicator) {
          indicator.classList.add("hidden");
          setTimeout(() => indicator.classList.remove("hidden"), 50);
        }
      });

      await expect(automator.waitForLogin(500)).resolves.toBeUndefined();

      await page.evaluate(() => {
        document.querySelector("img[alt='pfp']")?.remove();
      });

      expect(await automator.checkLoginStatus()).toBe(false);
    });

    test("new chat and chat navigation trigger expected clicks", async ({
      page,
    }) => {
      const automator = new GrokAutomator(page, "chat");

      await page.evaluate(() => {
        const links = document.querySelectorAll("a[href='/']");
        links.forEach((link) => {
          link.setAttribute("data-clicked", "false");
          link.addEventListener("click", () => {
            link.setAttribute("data-clicked", "true");
          });
        });
      });

      await automator.startNewChat();

      const newChatClicked = await page.evaluate(() => {
        return Array.from(document.querySelectorAll("a[href='/']")).some(
          (link) => link.getAttribute("data-clicked") === "true"
        );
      });

      expect(newChatClicked).toBe(true);

      await page.evaluate(() => {
        document
          .querySelectorAll("a[href^='/c/']")
          .forEach((anchor) => {
            anchor.setAttribute("data-clicked", "false");
            anchor.addEventListener("click", () => {
              anchor.setAttribute("data-clicked", "true");
            });
          });
      });

      await automator.openChat(1);

      expect(
        await page
          .locator("a[href^='/c/']")
          .nth(1)
          .getAttribute("data-clicked")
      ).toBe("true");
    });

    test("send message pipeline fills input and submits form", async ({
      page,
    }) => {
      const automator = new GrokAutomator(page, "chat");
      const sampleText = "Offline test message";

      await page.evaluate(() => {
        const button = document.querySelector(
          "button[aria-label='Submit']"
        ) as HTMLButtonElement | null;
        if (button) {
          button.setAttribute("data-clicked", "false");
          button.addEventListener("click", () => {
            button.setAttribute("data-clicked", "true");
          });
        }
      });

      await automator.sendMessage(sampleText);

      await expect(page.locator("[role='textbox']").first()).toHaveText(sampleText);
      expect(
        await page
          .locator("button[aria-label='Submit']")
          .first()
          .getAttribute("data-clicked")
      ).toBe("true");
    });

    test("response wait and chat state resolve correctly", async ({ page }) => {
      const automator = new GrokAutomator(page, "chat");

      await page.evaluate(() => {
        const container = document.querySelector("main");
        if (!container) return;
        const indicator = document.createElement("span");
        indicator.textContent = "Thought for 5s";
        container.appendChild(indicator);
        setTimeout(() => indicator.remove(), 50);
      });

      await automator.waitForResponse(500);
      expect(await automator.getChatState()).toBe("idle");

      await page.evaluate(() => {
        const container = document.querySelector("main");
        if (!container) return;
        const indicator = document.createElement("span");
        indicator.textContent = "Thought for 5s";
        container.appendChild(indicator);
      });

      expect(await automator.getChatState()).toBe("generating");

      await page.evaluate(() => {
        const indicator = Array.from(
          document.querySelectorAll("span")
        ).find((node) => node.textContent?.includes("Thought for"));
        indicator?.remove();
      });

      expect(await automator.getChatState()).toBe("idle");
    });

    test("messages extraction matches fixture snapshot", async ({ page }) => {
      const automator = new GrokAutomator(page, "chat");
      const messages = (await automator.getMessages()) as unknown[];

      expect(messages).toEqual(fixture.extraction.messages ?? []);

      const serialized = JSON.stringify(messages, null, 2);
      expect(serialized).toMatchSnapshot(`${fixture.name}-messages.json`);
    });
  });
});
