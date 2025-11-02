<!-- # Prompt: AI Assistant Web Page Selector Generator (v1.0 • JSON)

This prompt guides an AI agent to explore an **AI-assistant website** using Playwright MCP tools and generate **robust CSS selectors** for key elements across pages.
-->

## 🎯 Goal

Produce a concise, stable **JSON** spec that downstream runners use for DOM extraction and interaction.

---

## 📘 Schema Definition (v1.0, TypeScript reference)

```ts
export type CssSelector = string | string[];

export interface SelectorDef {
  /** One or more CSS selectors, tested in order. */
  selector: CssSelector;
  /** Optional attribute to extract, e.g., "textContent", "href". */
  attr?: string;
  /** Optional nested selectors for structured elements (e.g., message parts). */
  fields?: Record<string, SelectorDef>;
  /**
   * Contextual tips about stability, locale issues, visibility, etc.
   * Keep each item short and action-oriented for agents.
   * Examples: "Fallback uses aria-label; varies by locale", "Unique when sidebar expanded"
   */
  hints?: string[];
}

export interface AiAssistantPageSpec {
  /**
   * One or more glob-style URL patterns for this page.
   * Examples: "https://gemini.google.com/app*", "https://chatgpt.com/**"
   */
  urlGlob?: string | string[];

  /**
   * Core element keys, plus any additional elements the agent identifies as necessary
   * to accomplish specific user-requested tasks (not every discovered element should be added).
   */
  elements: {
    /** Visual cue or control confirming the user is logged in (avatar, account icon, menu, etc.). */
    loginIndicator?: SelectorDef;

    /** Control that starts a new chat or conversation (button, link, or similar trigger). */
    newChatButton?: SelectorDef;

    /** Links or entries representing existing or recent conversations, regardless of placement. */
    recentChatLinks?: SelectorDef;

    /** Input area where the user enters or edits their prompt/message. */
    messageInputArea?: SelectorDef;

    /** Button or control used to submit/send a chat message. */
    messageSubmitButton?: SelectorDef;

    /** Container or collection holding user messages and model responses. */
    messageBlocks?: SelectorDef;

    /** Visual indicator that the assistant is generating/processing a reply. */
    aiGeneratingIndicator?: SelectorDef;
  } & Record<string, SelectorDef>; // ← discovery-friendly

  /** Page-level contextual guidance (visibility, flows, prerequisites). */
  hints?: string[];
}

export interface AiAssistantSiteSpec {
  /** Optional version for schema/docs. */
  version?: string;

  /**
   * Required core pages:
   * - landing: landing/entry page
   * - chat: conversation page
   * Agents MAY add optional pages (history, projects, settings) if discovered.
   */
  pages: {
    landing: AiAssistantPageSpec;
    chat: AiAssistantPageSpec;
    [slug: string]: AiAssistantPageSpec;
  };

  /** Global guidance shared across pages (priorities, exploration strategy). */
  hints?: string[];
}
```

---

## 🗾 Example JSON Output

```json
{
  "version": "1.0",
  "pages": {
    "landing": {
      "urlGlob": ["https://gemini.google.com/app*"],
      "elements": {
        "loginIndicator": {
          "selector": ["a.gb_B[role='button'][aria-label*='Google Account']"],
          "hints": ["Indicates login status"]
        },
        "newChatButton": {
          "selector": [
            "button[data-test-id='new-chat']",
            "button[aria-label='New chat']"
          ],
          "hints": ["Prefer data-test-id when present"]
        },
        "recentChatLinks": {
          "selector": ["[data-test-id='conversation']"],
          "attr": "textContent",
          "hints": ["Sidebar chat list items; expand sidebar if hidden"]
        },
        "sidebarToggleButton": {
          "selector": [
            "button[data-test-id='side-nav-menu-button']",
            "button[aria-label='Main menu']"
          ],
          "hints": [
            "Toggles sidebar visibility",
            "Fallback uses aria-label; varies by locale"
          ]
        }
      },
      "hints": [
        "Use sidebarToggleButton to reveal recent chats if the sidebar is collapsed"
      ]
    },
    "chat": {
      "urlGlob": "https://gemini.google.com/app/**",
      "elements": {
        "messageInputArea": {
          "selector": ["[role='textbox'][aria-label*='prompt']"],
          "hints": [
            "Aria-label is localized; avoid exact text matching in non-English UIs"
          ]
        },
        "messageSubmitButton": {
          "selector": [
            "button[data-test-id='send-button']",
            "button[aria-label*='Send']"
          ],
          "hints": [
            "Prefer data-test-id; aria-label fallback is language-dependent"
          ]
        },
        "messageBlocks": {
          "selector": [".conversation-container"],
          "hints": ["Container for conversation turns"],
          "fields": {
            "userQuery": {
              "selector": ["user-query"],
              "fields": {
                "text": {
                  "selector": ["user-query-content"],
                  "attr": "textContent",
                  "hints": ["Extract raw user text"]
                }
              },
              "hints": ["Structure may differ across A/B variants"]
            },
            "modelResponse": {
              "selector": ["model-response"],
              "fields": {
                "text": {
                  "selector": ["message-content", ".model-response-text"],
                  "attr": "textContent",
                  "hints": ["Use stable container when multiple blocks exist"]
                }
              }
            }
          }
        },
        "aiGeneratingIndicator": {
          "selector": ["[class*='spinner']", "[role='progressbar']"],
          "hints": ["Visible while AI is generating"]
        },
        "recentChatLinks": {
          "selector": ["[data-test-id='conversation']"],
          "attr": "textContent",
          "hints": ["Available in sidebar when expanded"]
        }
      },
      "hints": ["Some elements appear only after the first message is sent"]
    }
  },
  "hints": [
    "Selector priority: data-* > id > role/structure > aria-label (fallback)",
    "Avoid dynamic/hashed classes",
    "Validate uniqueness with querySelectorAll before finalizing",
    "Expand sidebar before scraping recent chats"
  ]
}
```

---

## 🧬 Agent Instructions

### 1. Navigate & Snapshot

- Use `mcp__playwright__browser_navigate` to open the target URL.
- Use `mcp__playwright__browser_snapshot` to capture DOM with element refs.

### 2. Identify & Extract Selectors

- Locate key elements (input, submit, recent chats, etc.).
- Inspect attributes via `mcp__playwright__browser_evaluate(ref)`.
- **Priority:** `data-testid` / `data-test-id` → `id` → `role`/structure → **`aria-label` (fallback only)**.
- Avoid dynamic/hashed classes.

### 3. Test & Refine

- Validate with `document.querySelectorAll()`; ensure uniqueness and stability.
- Add fallback selectors only when independently stable.
- If using `aria-label`, state that in `hints` (“may vary by locale”).

### 4. Page Rules

- Always output `pages.landing` and `pages.chat`.
- Add extra pages (`history`, `settings`, `projects`) only when confirmed.
- Use `hints` to note conditional visibility (e.g., sidebar).

### 5. Output Rules

- Emit **strict JSON**.
- Include a `hints` for every selector.
- No comments, trailing commas, or unquoted keys.
- Do not include stubs or placeholders.

---

## 🔑 Quality Criteria

| Aspect                  | Requirement                                              |
| ----------------------- | -------------------------------------------------------- |
| **Selector stability**  | Prefer `data-*` attributes over `aria-label` or text     |
| **Language robustness** | Describe any locale-dependent selectors in `description` |
| **Schema compliance**   | Must match `AiAssistantSiteSpec`                         |
| **Minimalism**          | Include only essential, tested selectors                 |
| **Discoverability**     | Optional pages only when confirmed by browsing           |

---

## Key reminders for AI agents working with web automation:

1. `ref` is for reference, not for selection. The ref attribute is a temporary internal identifier for the browser tooling. It is not a stable selector and should
   not be used for interaction or assertions across multiple steps. Treat ref as a one-time-use pointer within a single snapshot.

2. Prioritize stable selectors. Always prioritize selectors in this order:

   - data-testid or other custom data-\* attributes.
   - id (if it is stable).
   - aria-label, role, and other accessibility attributes.
   - A combination of tag name and stable attributes (e.g., button[aria-label="Send message"]).
   - Structural relationships (e.g., parentElement, nextElementSibling) as a last resort, and only when the surrounding structure is stable.

3. Use `browser_evaluate` for complex interactions. Don't rely on a sequence of individual tools if you can accomplish the same task in a single browser_evaluate
   call. For example, instead of using browser_snapshot to find an element and then browser_type to type into it, use a single browser_evaluate to find the element and
   then use JavaScript to type into it. This is more robust and less prone to errors caused by page re-renders.

4. When in a loop, change your strategy. If you find yourself repeating the same action with the same tool and it's failing, don't just keep trying. The problem is
   likely with your approach, not a temporary issue with the page. Take a step back, analyze the problem, and try a different strategy.

5. Don't assume stability. Just because a selector works once doesn't mean it will work again. Always be prepared for elements to change or disappear. When
   possible, build in fallbacks or alternative selection strategies.

6. The page is a black box. Don't make assumptions about how the page is built or how it will behave. Use the tools to inspect the page and understand its structure
   and behavior.

---

# User Request

**Target AI Assistant Website:** https://chatgpt.com/

**Additional Information:**

- The site requires login, which I will handle. You should first workon login indicator.
