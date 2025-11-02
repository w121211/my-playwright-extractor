// tests/gemini-automation.spec.ts
import { expect, test } from "@playwright/test";
import { GeminiAutomator } from "../src/tasks/aichat/gemini.js";

test.describe("Gemini Automation", () => {
  test("check login status", async ({ page }) => {
    const automator = new GeminiAutomator(page, "landing");

    await page.goto("https://gemini.google.com/app/");

    const isLoggedIn = await automator.checkLoginStatus();

    // This will be true if the user is logged in, false otherwise
    // We just verify it returns a boolean
    expect(typeof isLoggedIn).toBe("boolean");
  });

  test.skip("start new chat - requires login", async ({ page }) => {
    const automator = new GeminiAutomator(page, "landing");

    await page.goto("https://gemini.google.com/app/");

    const isLoggedIn = await automator.checkLoginStatus();
    if (!isLoggedIn) {
      test.skip();
    }

    await automator.startNewChat();

    // Verify URL changed to a chat page
    expect(page.url()).toMatch(/gemini\.google\.com\/app\/[a-f0-9]+/);
  });

  test.skip("send message and wait for response - requires login", async ({
    page,
  }) => {
    const automator = new GeminiAutomator(page, "chat");

    await page.goto("https://gemini.google.com/app/");

    const isLoggedIn = await automator.checkLoginStatus();
    if (!isLoggedIn) {
      test.skip();
    }

    // Start new chat first
    await automator.startNewChat();

    // Send a simple message
    await automator.sendMessage("Hello! Please respond with just 'Hi'");

    // Wait for response
    await automator.waitForResponse();

    // Verify chat state is idle after response
    const state = await automator.getChatState();
    expect(state).toBe("idle");

    // Get messages
    const messages = await automator.getMessages();
    expect(messages.length).toBeGreaterThan(0);
  });

  test.skip("open existing chat - requires login", async ({ page }) => {
    const automator = new GeminiAutomator(page, "landing");

    await page.goto("https://gemini.google.com/app/");

    const isLoggedIn = await automator.checkLoginStatus();
    if (!isLoggedIn) {
      test.skip();
    }

    // Open the first chat in history
    await automator.openChat(0);

    // Verify we're on a chat page
    expect(page.url()).toMatch(/gemini\.google\.com\/app\/[a-f0-9]+/);
  });

  test.skip("extract messages from existing chat - requires login", async ({
    page,
  }) => {
    const automator = new GeminiAutomator(page, "chat");

    await page.goto("https://gemini.google.com/app/");

    const isLoggedIn = await automator.checkLoginStatus();
    if (!isLoggedIn) {
      test.skip();
    }

    // Open first chat
    await automator.openChat(0);

    // Extract messages
    const messages = await automator.getMessages();

    // Verify messages structure
    expect(Array.isArray(messages)).toBe(true);
    if (messages.length > 0) {
      const firstMessage = messages[0];
      expect(firstMessage).toHaveProperty("userQuery");
      expect(firstMessage).toHaveProperty("modelResponse");
    }
  });
});
