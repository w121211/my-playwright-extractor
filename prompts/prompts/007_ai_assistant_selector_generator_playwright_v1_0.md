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

### Tool & Reference Usage

1. **`ref` is for reference, not for selection.** The ref attribute is a temporary internal identifier for the browser tooling. It is not a stable selector and should
   not be used for interaction or assertions across multiple steps. Treat ref as a one-time-use pointer within a single snapshot.

2. **Use `browser_evaluate` for complex interactions.** Don't rely on a sequence of individual tools if you can accomplish the same task in a single browser_evaluate
   call. For example, instead of using browser_snapshot to find an element and then browser_type to type into it, use a single browser_evaluate to find the element and
   then use JavaScript to type into it. This is more robust and less prone to errors caused by page re-renders.

3. **When in a loop, change your strategy.** If you find yourself repeating the same action with the same tool and it's failing, don't just keep trying. The problem is
   likely with your approach, not a temporary issue with the page. Take a step back, analyze the problem, and try a different strategy.

### Selector Strategy & Stability

4. **Prioritize semantic attributes over structural patterns.** `aria-label`, `alt`, `href`, and `data-*` attributes are more stable than class names or DOM structure.
   Framework-generated classes (especially Tailwind utilities) change frequently and should be avoided.

5. **Prioritize stable selectors in this order:**
   - `data-testid` or other custom `data-*` attributes
   - `id` (if it is stable and human-authored)
   - `aria-label`, `role`, `alt`, and other accessibility attributes
   - `href` for links
   - A combination of tag name and stable attributes (e.g., `button[aria-label="Send message"]`)
   - Structural relationships (e.g., parentElement, nextElementSibling) as a last resort, and only when the surrounding structure is stable

6. **Avoid framework-generated identifiers.** Dynamic IDs like `radix-_r_2p_` or hashed class names change on every render. React/Radix/Vue/other framework internals
   are not reliable selectors. Look for human-authored attributes instead.

7. **Test for uniqueness immediately.** Use `document.querySelectorAll(selector).length` to verify uniqueness. A selector that matches multiple elements is useless
   without additional context.

8. **Fallback selectors should be independently stable.** Don't just add alternatives blindly - each fallback should work on its own. Validate that each alternative
   is unique and reliable before including it in the selector array.

### Page State & Visibility

9. **Don't assume stability.** Just because a selector works once doesn't mean it will work again. Always be prepared for elements to change or disappear. When
   possible, build in fallbacks or alternative selection strategies.

10. **The page is a black box.** Don't make assumptions about how the page is built or how it will behave. Use the tools to inspect the page and understand its structure
    and behavior.

11. **Understand visibility patterns.** Many modern UIs use opacity/hover-based visibility (`opacity-0 group-hover:opacity-100`). Elements may exist in DOM but not be
    visible/interactive. Document when elements require hover, focus, or specific states to become visible.

12. **Login state dramatically changes the page.** Always explore both logged-in and logged-out states. Document what's available in each state explicitly. Some elements
    are mutually exclusive between states.

13. **Prefer positive indicators over negative ones.** Detecting the presence of elements is more reliable than detecting absence. Pages can have loading states where
    nothing is present yet. Example: prefer "profile exists" over "sign-in link doesn't exist".

14. **Some features only appear after interaction.** Submit buttons may be hidden until input has content. Navigation controls only appear when there are multiple items.
    Don't assume an element doesn't exist just because it's not in the initial snapshot.

### Language & Localization

15. **Language-dependent attributes need special handling.** `aria-label` values in the DOM are typically in one language (often English in codebase), while placeholder
    text and visible labels may be localized. Always note in hints when a selector uses language-specific text.

### Message Structure in Chat UIs

16. **Message structure in chat UIs is often unstructured.** Unlike traditional forms, chat messages rarely have `data-testid` or semantic containers. Need to identify
    messages by surrounding action buttons (Edit, Copy) or content patterns. Document this lack of structure in hints.

### Validation & Documentation

17. **Validate in realistic scenarios.** Take snapshots at different stages: empty state, after typing, after response, with errors. Check if selectors work across
    different conversation types (new chat vs existing). Test edge cases.

18. **Document conditional visibility explicitly.** Note when elements require: login, hover, specific state, or user action. This helps downstream automation know when
    to expect elements. Use hints to capture operational context, not just technical details.

### Collaboration & Problem-Solving

19. **Work with the human, not alone.** If you encounter problems, ambiguity, or uncertainty, STOP and ask for help. Don't continue working in isolation when:
    - Login is required but you can't proceed (ask human to log in)
    - Page structure is unclear or ambiguous (ask for clarification)
    - Elements can't be found after multiple attempts (ask human to verify page state)
    - Multiple valid approaches exist (ask human for preference)
    - Site behavior is unexpected or inconsistent (ask human to confirm what they see)

    Collaboration produces better results than autonomous guessing. The human has context you don't have.

---

# User Request

**Target AI Assistant Website:** https://grok.com/

**Additional Information:**

- The site requires login, which I will handle. You should first workon login indicator.
