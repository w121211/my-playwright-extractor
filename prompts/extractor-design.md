# 🧭 Web Extractor Framework (MVP) — Design & Implementation Guide

## 1. 🎯 Goal

Build a **general web page extractor** driven by a **JSON schema**, not hardcoded logic.
The extractor:

- Reads a schema that defines selectors and structure.
- Uses Playwright/Puppeteer (or browser extension APIs) to extract or interact with page elements.
- Allows **reusability across different sites** by only changing the schema.

### Example use case

For an AI assistant web UI:

- Detect if user is logged in.
- Click “New Chat”.
- Input a prompt and send.
- Extract chat messages and detect when model generation finishes.

---

## 2. 💡 Core Principles

1. **MVP simplicity first** — avoid complex logic, loops, or conditionals.
2. **Schema-driven** — define what to extract, not how to do it.
3. **CSS selectors only** — simplest and most portable choice.
4. **Automatic waiting** — the executor handles waits globally.
5. **Extensible later** — future versions can add conditionals, XPath, or events.

---

## 3. 🧩 Schema Design (MVP)

### TypeScript definition

```ts
export type CssSelector = string | string[];

export interface SelectorDef {
  selector: CssSelector; // One or more CSS selectors (fallbacks)
  attr?: string; // Attribute to extract, e.g. 'textContent', 'href'
  all?: boolean; // true → extract from all matches
  fields?: Record<string, SelectorDef>; // Nested extraction
}

export interface PageSpec {
  urlMatch: string | string[]; // Regex patterns for matching page URL
  goto?: string; // Optional navigation URL
  timeoutMs?: number; // Page-level timeout override

  // Page elements
  loginIndicator?: SelectorDef;
  newChatButton?: SelectorDef;
  chatHistoryLinks?: SelectorDef;
  userInputBox?: SelectorDef;
  submitButton?: SelectorDef;
  messageBlocks?: SelectorDef;
  generatingIndicator?: SelectorDef;
}

export interface SiteSpec {
  mainPage?: PageSpec;
  chatPage?: PageSpec;
}
```

---

## 4. 📄 Example Schema (AI Assistant)

```json
{
  "mainPage": {
    "urlMatch": ["^https://ai-assistant\\.com/?$"],
    "goto": "https://ai-assistant.com/",
    "loginIndicator": { "selector": [".user-profile-avatar"] },
    "newChatButton": { "selector": ["nav > a[href='/new']"] },
    "chatHistoryLinks": {
      "selector": ["nav .chat-history-item"],
      "attr": "href",
      "all": true
    }
  },
  "chatPage": {
    "urlMatch": ["^https://ai-assistant\\.com/c/"],
    "userInputBox": { "selector": ["textarea[data-testid='prompt-input']"] },
    "submitButton": { "selector": ["button[data-testid='send-button']"] },
    "messageBlocks": {
      "selector": [".message-turn"],
      "all": true,
      "fields": {
        "role": { "selector": [".role"], "attr": "textContent" },
        "text": { "selector": [".message-text"], "attr": "textContent" },
        "id": { "selector": [":scope"], "attr": "data-message-id" },
        "time": { "selector": ["time"], "attr": "dateTime" }
      }
    },
    "generatingIndicator": { "selector": [".spinner-icon"] },
    "timeoutMs": 15000
  }
}
```

---

## 5. ⚙️ Execution Logic

The executor script loads this schema and performs the following:

### a. Navigation

- Navigate to `goto` if defined.
- Wait for `domcontentloaded`.

### b. Selectors & Fallbacks

- If a `selector` is a string → use directly.
- If an array → try each until one matches (`count() > 0`).

### c. Extraction Rules

- `attr` → which attribute to extract (default: `textContent`).
- `all: true` → loop over all matched elements.
- `fields` → nested extraction inside each element.

### d. Waiting & Timeouts

- Global default wait (e.g. 10s).
- Use Playwright’s `locator.waitFor()` automatically for each selector.

### e. Interaction Support

- Simple actions: `.click()` or `.fill()`.
- Future extension: add `"action": "click"` or `"action": "input"` in schema.

---

## 6. 🧠 Minimal Executor Example (Playwright)

```ts
import { Page } from "playwright";
import { SiteSpec, SelectorDef } from "./types";

async function resolveSelector(page: Page, selector: string | string[]) {
  const list = Array.isArray(selector) ? selector : [selector];
  for (const s of list) {
    const loc = page.locator(s);
    if (await loc.count()) return loc;
  }
  throw new Error(`No selector matched: ${list.join(", ")}`);
}

async function extractFrom(page: Page, def: SelectorDef) {
  const loc = await resolveSelector(page, def.selector);
  const extractAttr = async (el) =>
    def.attr === "textContent" || !def.attr
      ? (await el.textContent())?.trim()
      : await el.getAttribute(def.attr);

  if (def.all) {
    const count = await loc.count();
    const results = [];
    for (let i = 0; i < count; i++) {
      const el = loc.nth(i);
      if (def.fields) {
        const record = {};
        for (const [k, sub] of Object.entries(def.fields))
          record[k] = await extractFrom(el, sub);
        results.push(record);
      } else {
        results.push(await extractAttr(el));
      }
    }
    return results;
  } else {
    if (def.fields) {
      const record = {};
      for (const [k, sub] of Object.entries(def.fields))
        record[k] = await extractFrom(loc, sub);
      return record;
    }
    return await extractAttr(loc);
  }
}
```

---

## 7. 🧱 Example Usage

```ts
import { chromium } from "playwright";
import schema from "./ai_assistant.json";

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  await page.goto(schema.mainPage.goto);
  await page.waitForLoadState("domcontentloaded");

  // Check login
  await extractFrom(page, schema.mainPage.loginIndicator);

  // Start new chat
  const newChat = await extractFrom(page, schema.mainPage.newChatButton);
  await page.click(newChat.selector[0]);

  // Input prompt & send
  const chatInput = await extractFrom(page, schema.chatPage.userInputBox);
  await page.fill(chatInput.selector[0], "Hello, AI!");
  await page.click(schema.chatPage.submitButton.selector[0]);

  // Wait for generation to finish
  const spinner = schema.chatPage.generatingIndicator;
  if (spinner) {
    const loc = page.locator(spinner.selector[0]);
    await loc.waitFor({ state: "detached", timeout: 60000 });
  }

  // Extract messages
  const messages = await extractFrom(page, schema.chatPage.messageBlocks);
  console.log(messages);

  await browser.close();
})();
```

---

## 8. 🔄 Future Extensions

| Feature                                | Rationale                                                         |
| -------------------------------------- | ----------------------------------------------------------------- |
| `waitFor` per selector                 | Custom timeouts for fragile elements                              |
| `xpath:` prefix support                | For rare non-CSS elements                                         |
| `stateMachine` (generating → finished) | More precise chat completion detection                            |
| `actions`                              | Declarative click, input, or scroll steps                         |
| `conditions`                           | “If not logged in → wait for login”                               |
| `modules`                              | Reusable sub-schemas per site (e.g., loginChecker, chatExtractor) |

---

## 9. ✅ Key Takeaways

- **MVP Focus:** Keep JSON schema minimal (`selector`, `attr`, `fields`, `all`).
- **CSS-only:** Sufficient for 95% of automation tasks.
- **Automatic waiting:** Let executor handle timeouts; no `waitFor` in schema yet.
- **Fallback selectors:** Use arrays instead of `anyOf`.
- **Clean extensibility:** Future changes can be backward-compatible.
