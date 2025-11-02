# Prompt: Create a Fixture Creation Tool

## Objective
Develop a script that helps developers quickly and easily create high-quality test fixtures for the extractor tests. This tool is essential for supporting the test-driven development workflow.

## Background
The extractor's TDD process relies on having static, real-world HTML fixtures to test against. Manually saving these files is tedious and error-prone. This tool will automate the process, ensuring that fixtures are complete and well-organized.

## Core Requirements

### 1. Headed Browser Interaction
- The tool must launch a headed (visible) Playwright browser so the user can navigate, log in, and interact with the target AI assistant website.

### 2. Automated Fixture Saving
- The script should automatically save a complete fixture whenever the user navigates to a new page or the page state changes significantly.
- A fixture consists of:
    - `index.html`: The complete `document.documentElement.outerHTML` of the page.
    - `metadata.json`: A file containing the page's URL, title, and the ISO timestamp of when it was saved.

### 3. Manual Save Trigger
- Provide a hotkey (e.g., `Ctrl+S` or another key combination) that allows the user to manually trigger the saving of the current page state at any time. This is useful for capturing specific states, like during message generation or when an error is displayed.

### 4. Organized Output
- Fixtures should be saved to a consistent, organized directory structure.
- The recommended structure is `tests/fixtures/{timestamp}-{domain}/`.
    - `timestamp`: An ISO 8601 timestamp (e.g., `2025-10-26T10-30-00-000Z`).
    - `domain`: The domain of the website (e.g., `gemini.google.com`).

## Implementation Guidelines

- **Location**: The script should be placed in `src/tools/create-fixture.ts`.
- **Simplicity**: Avoid over-engineering. The tool should be a simple, focused script.
- **Dependencies**: Use Playwright and Node.js built-in modules (`fs`, `path`).
- **User Feedback**: The script should log clear messages to the console, indicating when it is running, when a page is being saved, and where the fixture has been stored.

## Example Workflow
1. The developer runs `npm run create-fixture`.
2. A Chrome browser window opens.
3. The developer navigates to `gemini.google.com` and logs in.
4. The script automatically saves a fixture for the main application page.
5. The developer clicks on a conversation.
6. The script automatically saves a fixture for the conversation page.
7. The developer presses the hotkey to manually save a fixture in the middle of a long conversation.
8. The developer closes the browser, and the script terminates.
9. The `tests/fixtures` directory now contains the newly created fixture directories, ready to be used in tests.
