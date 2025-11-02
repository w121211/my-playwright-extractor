# Prompt: Test-Driven Development Workflow for AI Assistant Extractor

## Objective
Define the core test-driven development (TDD) workflow for creating a Playwright-based extractor for an AI assistant website.

## Guiding Principles
- **MVP First**: Start with the simplest possible implementation and iterate.
- **Test-Driven**: Write tests before writing implementation code.
- **Fixture-Based**: Use static HTML fixtures to ensure tests are fast, reliable, and deterministic.
- **Iterative Improvement**: Continuously refine the extractor by adding more test cases and handling edge cases.

## Development Workflow

### Step 1: Create Fixtures
1.  **Navigate & Save**: Use a script or manual process to navigate to the target AI assistant website (e.g., `https://gemini.google.com/app`).
2.  **Capture Real-World Data**: Save the complete HTML and metadata (URL, title, timestamp) of several representative pages:
    *   A "new chat" page.
    *   A short conversation.
    *   A long and complex conversation with multiple turns, code blocks, and other elements.
3.  **Organize Fixtures**: Store these fixtures in a structured directory, such as `tests/fixtures/{timestamp}-{domain}/`. Each fixture directory should contain:
    *   `index.html`: The full HTML of the page.
    *   `metadata.json`: The URL, page title, and timestamp.

### Step 2: Write a Failing Test
1.  **Create a Test File**: In your testing framework (e.g., Playwright Test), create a new test file (e.g., `tests/extractor.spec.ts`).
2.  **Load a Fixture**: Write a test case that loads one of the created fixtures (e.g., the short conversation).
3.  **Define Expectations**: Assert that the extractor function (which doesn't exist yet) produces a specific, expected JSON output. This expected output can be manually written or created as a snapshot file.

### Step 3: Implement the Extractor
1.  **Create the Extractor File**: Create the extractor script (e.g., `src/gemini-extractor.ts`).
2.  **Write Minimal Code**: Implement the simplest possible version of the extractor function that can pass the test. The function should take the fixture data (HTML and metadata) as input.
3.  **Run the Test**: Run the test and watch it pass.

### Step 4: Refactor and Iterate
1.  **Improve the Code**: Refactor the extractor code for clarity, performance, and maintainability.
2.  **Expand Test Coverage**: Add more test cases using the other fixtures (new chat, long conversation). For each new fixture, repeat the cycle of writing a failing test and then updating the extractor to make it pass.
3.  **Handle Edge Cases**: Add tests for potential edge cases, such as empty messages, error states, or unusual content.

### Step 5: Finalize
- Once the extractor produces satisfactory results for all test cases, the development for that extractor is considered complete. The final output is the well-tested extractor script.
