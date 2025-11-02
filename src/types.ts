// src/types.ts

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

export interface PageSpec {
  url?: string; // optional navigation URL
  urlMatch?: string | string[]; // regex string(s) to match current URL
  timeoutMs?: number; // page-level timeout override (MVP)
  elements?: Record<string, SelectorDef>;
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

export type SiteSpec = Record<string, PageSpec>;
