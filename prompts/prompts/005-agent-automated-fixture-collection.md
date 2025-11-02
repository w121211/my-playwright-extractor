# Prompt: Agent-Driven Fixture Collection

## 🎯 Objective
Your mission is to act as an automated QA engineer. You will systematically navigate a live AI assistant website to collect a diverse and comprehensive set of test fixtures. The fixture-saving mechanism is automated and will trigger on each new page load; your primary role is to drive the navigation.

## 📎 Prerequisites
- You are operating within a browser controlled by Playwright.
- An automated script is running that saves a fixture (`source.html`, `metadata.json`, etc.) every time a page fully loads.

## 🗺️ Agent Workflow

### Step 1: Initial Navigation and Login Check
1.  **Navigate**: Go to the target URL: `{URL}`.
2.  **Assess Login State**: Evaluate the page to determine if you are logged in. Look for a user avatar, a "Log In" button, or other indicators.
3.  **Handle Login**: 
    *   If you are already logged in, proceed to the next step.
    *   If a login is required, **PAUSE** and output a message to the user: "Please log in to the website in the browser. I will wait for a key element (e.g., user avatar) to appear before continuing."
    *   After the user logs in, detect the logged-in state and proceed.

### Step 2: Initial Page Collection
1.  **Save Landing Page**: The fixture for the initial landing/chat page should have been saved automatically. 
2.  **Identify Key UI Areas**: Analyze the page to identify the main navigation elements, particularly the list of previous conversations.

### Step 3: Systematic Conversation Fixture Collection
1.  **Extract Conversation List**: Locate and extract a list of all available conversations. For each conversation, get its link/URL and title.
2.  **Iterate and Collect**: Loop through the list of conversations one by one:
    a.  Log the title of the conversation you are about to collect (e.g., "Collecting fixture for: 'My Python Conversation'").
    b.  Click on the conversation link.
    c.  **Wait for Navigation**: Wait for the page to fully load. The automated fixture script will save the data during this time.
    d.  **Ensure Full Load (Optional but Recommended)**: Once the page has loaded, scroll to the bottom of the conversation to trigger any lazy-loaded content.
    e.  Navigate back to the main list to select the next conversation.

### Step 4: Collect Edge Case Fixtures
After collecting all standard conversations, actively seek out and save fixtures for the following edge cases:

*   **New Chat Page**: If not already saved, navigate to a fresh, empty chat session.
*   **Long Conversation**: Find the longest conversation in the list and ensure you have scrolled to both the top and the bottom.
*   **Multi-Modal Content**: If you identify any conversations that contain images, code blocks, or file uploads, ensure they are collected.
*   **Error States**: Attempt to generate an error if possible (e.g., by sending a malformed prompt, though this is optional) and save the resulting page.

### Step 5: Finalization
Once you have systematically navigated through all conversations and edge cases, output a message indicating that the collection process is complete.

## 💡 Guiding Principles
- **Be Systematic**: Don't browse randomly. Follow the list of conversations methodically.
- **Verify Your Actions**: After clicking a link, use `waitFor` functions to confirm that the page has transitioned and the expected new content (like a conversation title) is visible.
- **Log Your Intent**: Before you take an action (like clicking a link), log what you are about to do. This makes the process transparent.
