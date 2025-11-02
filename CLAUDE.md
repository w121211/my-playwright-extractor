# my-playwright-extractor Development Guidelines

A Playwright-based extractor for AI assistant web pages like Google Gemini. Last updated: 2025-09-29

## Active Technologies
- TypeScript/Node.js (LTS v18+) + Playwright (web automation), minimal additional deps

## Project Structure
```
src/
├── cli.ts         - Command-line interface
├── extractor.ts   - Main extractor class
├── auth.ts        - Authentication detection
├── parser.ts      - Conversation parsing logic
└── types.ts       - TypeScript type definitions
tests/
```

## Usage
```bash
# Extract conversation with interactive login
npm run extract "https://gemini.google.com/app/conversation-id" --headless=false

# Extract conversation in headless mode (requires existing login)
npm run extract "https://gemini.google.com/app/conversation-id"

# Save output to file
npm run extract "https://gemini.google.com/app/conversation-id" --output=conversation.json
```

## Commands
- `npm run build` - Build TypeScript project
- `npm run extract <url>` - Extract conversation from Gemini URL
- `npm test` - Run tests
- `npm run lint` - Run TypeScript type checking

## Code Style
TypeScript/Node.js (LTS v18+): Follow standard conventions

<!-- MANUAL ADDITIONS START -->
## Development Guidelines

### General

- **No backward compatibility required** - Always write the best, most modern code without considering legacy support
- **MVP approach:**
  - Keep development lean and simple, avoid over-engineering
  - **Don't reinvent the wheel** - Use installed libraries and packages when available
  - If a library provides a ready-made class, use it directly instead of creating wrapper classes
  - Leverage existing solutions rather than building custom implementations
- **Core principles:**
  - **Explicit is better than implicit** - Always favor explicit declarations, clear function signatures, and obvious code intent over clever shortcuts
- **TypeScript best practices:**
  - Ensure full type safety
  - Avoid using `as` type assertions
  - Follow strict TypeScript conventions
  - Explicitly type function parameters and return values
  - Use explicit imports/exports instead of wildcards
  - **Prefer native library types** - When using external libraries, import and use their native types instead of creating custom definitions
- **Native types principle:**
  - **Always use library's native types when available** - Avoid creating custom types that duplicate or wrap existing library types
  - **Import types directly from the source** - Use the exact types that library functions expect and return
  - **Examples:**
    - ✅ **Good**: Using AI SDK's native `ModelMessage` type for chat messages

      ```typescript
      import { streamText, type ModelMessage } from "ai";

      const messages: ModelMessage[] = [{ role: "user", content: "Hello" }];

      const result = await streamText({
        model: openai("gpt-4"),
        messages, // Native ModelMessage[] type
      });
      ```

    - ❌ **Bad**: Creating custom message type that duplicates library functionality

      ```typescript
      // Don't do this
      interface CustomMessage {
        role: string;
        content: string;
      }

      const messages: CustomMessage[] = [...];
      // Then converting to library format later
      ```

- **Code organization:**
  - No centralized type/schema/event definition files
  - Define types, schemas, and events directly in their responsible files (services, repositories, routes)
  - **No index.ts files** - Use direct imports instead of barrel exports
- **Error handling:**
  - Minimal error handling approach
  - Avoid try/catch blocks - let errors bubble up naturally
  - Throw errors directly when needed
- **Documentation:**
  - Add comments only when necessary
  - Keep comments clear, concise, and lean
  - Include file relative path as comment on first line: `// path/to/file.ts`
- **Output language:** English only

<!-- MANUAL ADDITIONS END -->