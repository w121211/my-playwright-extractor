// src/tasks/aichat/chatgpt.ts
import type { Page } from "playwright";
import type { AiAssistantSiteSpec } from "../../types.js";
import { readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { BaseAiChatAutomator } from "./base.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const specPath = resolve(
  __dirname,
  "../../../tests/selectors/chatgpt-selectors-1031.json"
);
const chatgptSpec = JSON.parse(
  readFileSync(specPath, "utf-8")
) as AiAssistantSiteSpec;

export class ChatGPTAutomator extends BaseAiChatAutomator {
  constructor(page: Page, pageName: "landing" | "chat" = "chat") {
    super(page, chatgptSpec.pages[pageName]);
  }
}
