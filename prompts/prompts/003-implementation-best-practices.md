# Prompt: Best Practices for Implementing a Robust Web Extractor

## Objective
To provide a set of guiding principles and best practices for writing high-quality, robust, and maintainable extractor functions. The primary goal is to create an extractor that is resilient to minor UI changes and works across different languages.

## 1. The Selector Strategy: A Hierarchy of Robustness

The single most important factor in a robust extractor is its selector strategy. Brittle selectors are the primary cause of breakages. Adhere to the following priority order when choosing selectors.

**🥇 Priority 1: Unique Data Attributes**
- **Description**: Attributes added specifically for testing and automation.
- **Examples**: `data-testid`, `data-cy`, `data-qa`
- **Why**: These are an explicit contract between the developers and the tests. They are the least likely to change.

**🥈 Priority 2: ARIA Attributes**
- **Description**: Accessibility attributes that define the role and state of UI elements.
- **Examples**: `role="dialog"`, `aria-label="Send message"`, `aria-describedby="error-message"`
- **Why**: These are tied to the application's semantics and accessibility features, which change less frequently than visual styling.

**🥉 Priority 3: Stable, Semantic IDs and Class Names**
- **Description**: `id` attributes or CSS class names that describe the *function* of an element, not its appearance.
- **Good Examples**: `id="chat-history"`, `class="chat-message-container"`
- **Bad Examples**: `id="-generated-123"`, `class="mt-2 text-red-500"`
- **Why**: Functional classes and IDs are more stable than stylistic ones, which can change with any design tweak.

**🏅 Priority 4: Element Type + Stable Attributes**
- **Description**: Combine an HTML tag with a stable attribute.
- **Examples**: `textarea[name="prompt"]`, `button[title="Copy code"]`
- **Why**: This is a good option when a more specific attribute isn't available.

**⚠️ Last Resort: Structural Relationships**
- **Description**: Relying on the DOM structure (parent-child or sibling relationships).
- **Example**: `div.user-avatar + div.message-content`
- **Why**: This is the most brittle approach. Use it only when no other option exists, as any change to the layout will break the selector.

--- 

### 🚫 **Anti-Pattern: Never Select by Visible Text** 🚫
- **Description**: Using the text content of an element to find it.
- **Example**: `button:contains("Send")`
- **Why**: This will instantly break the extractor when the application is translated into another language. It is not a viable strategy for a robust, global tool.

--- 

## 2. Debugging and Verification Workflow

- **Inspect, Don't Guess**: If a selector fails, do not try to guess the fix. Use the browser's developer tools to inspect the DOM and find the correct selector.
- **Get the `outerHTML`**: The most reliable way to debug is to log the `outerHTML` of the closest stable parent element (or the entire `document.body`). This shows you the *exact* DOM structure that your code is seeing.
- **Iterate and Verify**: Test each function and selector immediately after writing it. Do not write all the functions at once and then test them.
- **Test Generality**: After successfully extracting from one conversation, immediately test the extractor on a different conversation to ensure the selectors are not hardcoded to a specific case.

## 3. Handling Dynamic Content

- **Wait for Elements**: If content is loaded dynamically, use explicit waits (e.g., `playwright.waitForSelector`) to ensure the element exists before you try to interact with it.
- **Check Network Requests**: Use the browser's network panel to see if the data for the component has been successfully loaded. An empty element might be a sign of a failed API call.
