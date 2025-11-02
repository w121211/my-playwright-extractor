// tests/chatgpt-automation.spec.ts
import { expect, test } from "@playwright/test";
import { ChatGPTAutomator } from "../src/tasks/aichat/chatgpt.js";

test.describe("ChatGPT Automation", () => {
  test("check login status", async ({ page }) => {
    const automator = new ChatGPTAutomator(page, "landing");

    await page.goto("https://chatgpt.com/");

    const isLoggedIn = await automator.checkLoginStatus();

    // This will be true if the user is logged in, false otherwise
    // We just verify it returns a boolean
    expect(typeof isLoggedIn).toBe("boolean");
  });

  test("start new chat - requires login", async ({ page }) => {
    const automator = new ChatGPTAutomator(page, "landing");

    await page.goto("https://chatgpt.com/");

    const isLoggedIn = await automator.checkLoginStatus();
    if (!isLoggedIn) {
      await automator.waitForLogin();
    }

    await automator.startNewChat();

    // Verify URL changed to a chat page
    expect(page.url()).toMatch(/chatgpt\.com\/c\//);
  });

  test("send message and wait for response - requires login", async ({
    page,
  }) => {
    const automator = new ChatGPTAutomator(page, "chat");

    await page.goto("https://chatgpt.com/");

    const isLoggedIn = await automator.checkLoginStatus();
    if (!isLoggedIn) {
      await automator.waitForLogin();
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

  test("open existing chat - requires login", async ({ page }) => {
    const automator = new ChatGPTAutomator(page, "landing");

    await page.goto("https://chatgpt.com/");

    const isLoggedIn = await automator.checkLoginStatus();
    if (!isLoggedIn) {
      await automator.waitForLogin();
    }

    // Open the first chat in history
    await automator.openChat(0);

    // Verify we're on a chat page
    expect(page.url()).toMatch(/chatgpt\.com\/c\//);
  });

  test("extract messages from existing chat - requires login", async ({
    page,
  }) => {
    const automator = new ChatGPTAutomator(page, "chat");

    // Navigate to a chat page (replace with actual chat URL)
    await page.goto("https://chatgpt.com/");

    const isLoggedIn = await automator.checkLoginStatus();
    if (!isLoggedIn) {
      await automator.waitForLogin();
    }

    // Open first chat
    await automator.openChat(0);

    // Extract messages
    const messages = await automator.getMessages();

    // Verify messages structure
    expect(Array.isArray(messages)).toBe(true);
    if (messages.length > 0) {
      const firstMessage = messages[0];
      expect(firstMessage).toHaveProperty("userMessage");
      // Assistant message might not exist for first turn
    }
  });
});
