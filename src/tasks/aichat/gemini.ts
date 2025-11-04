// src/tasks/aichat/gemini.ts
import type { Page } from "playwright";
import type { AiAssistantPageSpec } from "../../types.js";
import { BaseAiChatAutomator } from "./base.js";

export class GeminiAutomator extends BaseAiChatAutomator {
  constructor(page: Page, pageSpec: AiAssistantPageSpec) {
    super(page, pageSpec);
  }
}
