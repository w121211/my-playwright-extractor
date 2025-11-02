// src/tasks/aichat/base.ts
import type { Page } from "playwright";
import type { AiAssistantPageSpec } from "../../types.js";
import { resolveLocator, extractFrom } from "../../extractor.js";

export interface AiChatAutomator {
  checkLoginStatus(): Promise<boolean>;
  waitForLogin(timeout?: number): Promise<void>;
  startNewChat(): Promise<void>;
  openChat(index?: number): Promise<void>;
  sendMessage(text: string): Promise<void>;
  waitForResponse(timeout?: number): Promise<void>;
  getMessages(): Promise<any[]>;
  getChatState(): Promise<"generating" | "idle" | "error">;
}

export class BaseAiChatAutomator implements AiChatAutomator {
  constructor(
    protected readonly page: Page,
    protected readonly spec: AiAssistantPageSpec
  ) {}

  async checkLoginStatus(): Promise<boolean> {
    if (!this.spec.elements.loginIndicator) return false;
    const loc = await resolveLocator(
      this.page,
      this.spec.elements.loginIndicator.selector
    );
    return (await loc.count()) > 0;
  }

  async waitForLogin(timeout = 300000): Promise<void> {
    if (!this.spec.elements.loginIndicator) {
      throw new Error("loginIndicator not defined in spec");
    }
    console.log("⏳ Waiting for user to log in... (timeout: ${timeout}ms)");
    const loc = await resolveLocator(
      this.page,
      this.spec.elements.loginIndicator.selector
    );
    await loc.waitFor({ state: "visible", timeout });
    console.log("✓ Login detected!");
  }

  async startNewChat(): Promise<void> {
    if (!this.spec.elements.newChatButton) {
      throw new Error("newChatButton not defined in spec");
    }
    const loc = await resolveLocator(
      this.page,
      this.spec.elements.newChatButton.selector
    );
    await loc.click();
  }

  async openChat(index?: number): Promise<void> {
    if (!this.spec.elements.recentChatLinks) {
      throw new Error("recentChatLinks not defined in spec");
    }
    const loc = await resolveLocator(
      this.page,
      this.spec.elements.recentChatLinks.selector
    );
    const target = index !== undefined ? loc.nth(index) : loc.first();
    await target.click();
  }

  async sendMessage(text: string): Promise<void> {
    if (
      !this.spec.elements.messageInputArea ||
      !this.spec.elements.messageSubmitButton
    ) {
      throw new Error("messageInputArea or messageSubmitButton not defined in spec");
    }
    const input = await resolveLocator(
      this.page,
      this.spec.elements.messageInputArea.selector
    );
    await input.fill(text);
    const submit = await resolveLocator(
      this.page,
      this.spec.elements.messageSubmitButton.selector
    );
    await submit.click();
  }

  async waitForResponse(timeout = 60000): Promise<void> {
    if (!this.spec.elements.aiGeneratingIndicator) return;
    const loc = await resolveLocator(
      this.page,
      this.spec.elements.aiGeneratingIndicator.selector
    );
    try {
      await loc.waitFor({ state: "detached", timeout });
    } catch {
      // Indicator might not appear, ignore
    }
  }

  async getMessages(): Promise<any[]> {
    if (!this.spec.elements.messageBlocks) return [];
    return await extractFrom(this.page, this.spec.elements.messageBlocks);
  }

  async getChatState(): Promise<"generating" | "idle" | "error"> {
    if (!this.spec.elements.aiGeneratingIndicator) return "idle";
    const loc = await resolveLocator(
      this.page,
      this.spec.elements.aiGeneratingIndicator.selector
    );
    const count = await loc.count();
    return count > 0 ? "generating" : "idle";
  }
}
