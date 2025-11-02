## Goal

Your primary goal is to inspect the DOM of an AI assistant's web page and create a JSON object containing robust CSS selectors for key elements. This JSON object must conform to the `AiAssistantSiteSpec` schema provided below.

## Schema Definition (`AiAssistantSiteSpec`)

The structure of the final JSON output is defined by these TypeScript types:

```typescript
export type CssSelector = string | string[];

export interface SelectorDef {
  selector: CssSelector; // one or more CSS selectors (fallbacks)
  attr?: string; // e.g., 'textContent', 'href', 'src', or any attribute
  fields?: Record<string, SelectorDef>; // For nested extractions
}

export interface AiAssistantPageSpec {
  urlMatch?: string | string[]; // Regex to match the page URL
  elements: {
    loginIndicator?: SelectorDef;
    newChatButton?: SelectorDef;
    chatHistoryLinks?: SelectorDef;
    userInputBox?: SelectorDef;
    submitButton?: SelectorDef;
    messageBlocks?: SelectorDef;
    generatingIndicator?: SelectorDef;
  };
}

export interface AiAssistantSiteSpec {
  mainPage: AiAssistantPageSpec;
  chatPage: AiAssistantPageSpec;
}
```

## Example Output

Here is an example of the expected JSON output for a fictional AI assistant site:

```json
{
  "mainPage": {
    "urlMatch": ["^https://ai-assistant.com/?$"],
    "elements": {
      "loginIndicator": { "selector": [".user-profile-avatar"] },
      "newChatButton": { "selector": ["nav > a[href='/new']"] },
      "chatHistoryLinks": {
        "selector": ["nav .chat-history-item"],
        "attr": "href"
      }
    }
  },
  "chatPage": {
    "urlMatch": ["^https://ai-assistant.com/c/"],
    "elements": {
      "userInputBox": { "selector": ["textarea[data-testid='prompt-input']"] },
      "submitButton": { "selector": ["button[data-testid='send-button']"] },
      "messageBlocks": {
        "selector": [".message-turn"],
        "fields": {
          "role": { "selector": [".role"], "attr": "textContent" },
          "text": { "selector": [".message-text"], "attr": "textContent" }
        }
      },
      "generatingIndicator": { "selector": [".spinner-icon"] }
    }
  }
}
```

---

## Agent Instructions

Follow these instructions based on your capabilities (Browser Agent vs. Playwright Agent).

**Workflow:**

1.  **Analyze the Page:** The user will provide you with a web page of an AI assistant. Your task is to thoroughly inspect its structure.
2.  **Identify Key Elements:** Locate the HTML elements corresponding to the fields in the `AiAssistantSiteSpec` schema (`loginIndicator`, `userInputBox`, etc.) for both the `mainPage` and the `chatPage`.
3.  **Craft Selectors:** For each element, write a robust CSS selector.
    - **Prioritize stability:** Prefer selectors using `data-testid`, `id`, or other unique and stable attributes over fragile, auto-generated class names.
    - **Use fallbacks:** If possible, provide an array of selectors as fallbacks.
    - **Test your selectors:** Use the browser's developer tools (e.g., `document.querySelector`) to verify that each selector uniquely identifies the correct element.
4.  **Handle Missing Elements:** If you cannot find a selector for a specific element (e.g., the site has no visible "new chat" button), omit it from the JSON output and report it to the user.
5.  **Address Dynamic Content & Logins:**
    - Be aware that some elements might only appear after a user action (e.g., login).
    - If you suspect that a login is required to see the full page, pause your work, inform the user, and await their instructions. Do not attempt to log in yourself.
6.  **Construct the JSON:** Assemble the selectors into a single JSON object matching the `AiAssistantSiteSpec` schema.
7.  **Present and Iterate:**
    - Show the user the complete JSON output.
    - Report any selectors you were unable to find.
    - Ask for feedback and be prepared to refine the selectors based on user input.

---

# User Request

**AI Assistant Website URL:** https://chatgpt.com/

**Additional Information:**

- The site requires login, which I will handle. You should first workon login indicator.
