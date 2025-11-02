# Prompt: A Robust Architecture for an Assistant Page Extractor

## Objective
Define a robust, scalable, and test-driven architecture for an AI assistant page extractor. This architecture should be framework-agnostic in its core logic and provide clear contracts for implementation.

## Core Components

### 1. Public Types & Interfaces
This is the central contract for the entire system. It defines the data structures and the public-facing API of the extractor.

```typescript
/* ===== Public Types & Interfaces (Stable Contract) ===== */

export type AssistantSite = "chatgpt" | "claude" | "gemini" | "perplexity" | "custom";
export type ChatRole = "user" | "assistant" | "tool" | "system";
export type TurnPhase = "idle" | "thinking" | "generating" | "stopped" | "error";
export type LoginStateStatus = "unknown" | "required" | "logged_in";

export interface GenerationState {
  phase: TurnPhase;
  currentTurnId?: string;
  progress?: number;
  errorMessage?: string;
}

export interface LoginState {
  status: LoginStateStatus;
  user?: { id?: string; name?: string; avatarUrl?: string };
}

export interface ChatSummary {
  id: string;
  title: string;
  preview?: string;
  updatedAt?: number;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  text?: string;
  parts?: Array<
    | { type: "text"; text: string }
    | { type: "code"; language?: string; code: string }
    | { type: "image"; alt?: string; src: string }
  >;
  timestamp?: number;
}

export interface ChatDetails {
  id: string;
  title?: string;
  messages: ReadonlyArray<ChatMessage>;
}

// Wrapper types for robust error handling
export interface Result<T> { ok: true; value: T; warn?: string[] }
export interface ErrResult { ok: false; error: ExtractorError; warn?:string[] }
export type Res<T> = Result<T> | ErrResult;

export interface ExtractorError {
  code: "ELEMENT_NOT_FOUND" | "TIMEOUT" | "UNSUPPORTED" | "PARSE_FAILED" | "NOT_LOGGED_IN" | "UNKNOWN";
  message: string;
  selector?: string;
  cause?: unknown;
}
```

### 2. The `DomDriver` Abstraction
This interface decouples the extractor from the underlying browser automation tool (e.g., Playwright). It defines a set of simple, promise-based methods for interacting with the DOM.

```typescript
/* ===== Driver Abstraction ===== */
export interface DomDriver {
  exists(selector: string, timeoutMs?: number): Promise<boolean>;
  getAllTexts(selector: string, timeoutMs?: number): Promise<string[]>;
  getText(selector: string, timeoutMs?: number): Promise<string>;
  getAttr(selector: string, name: string, timeoutMs?: number): Promise<string | null>;
  eval<T>(fn: () => T | Promise<T>): Promise<T>;
}
```

### 3. The `InPageExtractor`
This is a class or set of functions designed to be executed *inside the browser's context* via `page.evaluate()`. It should be written in pure, standard JavaScript and have no external dependencies. Its role is to perform the actual DOM scraping.

```typescript
/* ===== In-Page Extractor (Executed in browser context) ===== */
export interface InPageExtractor {
  detectLoginState(): LoginState;
  extractChatList(): ReadonlyArray<ChatSummary>;
  extractChatDetails(): ChatDetails;
}
```

### 4. The `AsyncExtractor`
This is the main public-facing class. It uses a `DomDriver` to communicate with the browser and orchestrates the execution of the `InPageExtractor`. It handles all the asynchronous logic and error wrapping.

```typescript
/* ===== Async Extractor (Main public API) ===== */
export interface AsyncExtractor {
  readonly site: AssistantSite;

  detectLoginState(): Promise<Res<LoginState>>;
  extractChatList(): Promise<Res<ReadonlyArray<ChatSummary>>>;
  extractChatDetails(): Promise<Res<ChatDetails>>;
}
```

### 5. The Factory
A factory function creates and configures an `AsyncExtractor` instance for a specific AI assistant site, injecting the appropriate selectors and capabilities.

```typescript
/* ===== Factory ===== */
export interface ExtractorFactory {
  create(driver: DomDriver, site: AssistantSite): AsyncExtractor;
}

// Example Usage:
// const driver = makePlaywrightDriver(page);
// const extractor = extractorFactory.create(driver, "gemini");
// const chatListResult = await extractor.extractChatList();
```

## Implementation Notes
- **Selectors**: Selectors should be configurable and passed into the extractor, not hardcoded. This allows the same extractor logic to be used for different sites with different UI structures.
- **Error Handling**: The `AsyncExtractor` is responsible for catching errors from the `DomDriver` or `InPageExtractor` and wrapping them in the `ErrResult` type.
- **Placeholders**: For unimplemented features, the extractor should return a typed `ErrResult` with an `UNSUPPORTED` error code.
