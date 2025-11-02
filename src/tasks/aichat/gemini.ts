// src/tasks/aichat/gemini.ts
import type { Page } from "playwright";
import { BaseAiChatAutomator } from "./base.js";
import geminiSpec from "../../../tests/selectors/gemini-selectors-1030.json" with { type: "json" };

export class GeminiAutomator extends BaseAiChatAutomator {
  constructor(page: Page, pageName: "landing" | "chat" = "chat") {
    super(page, geminiSpec.pages[pageName]);
  }
}
