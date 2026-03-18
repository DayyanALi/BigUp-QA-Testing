import { test, expect } from '@playwright/test';
import { BiggiePage } from './pages/BiggiePage';
import { ChatPage } from './pages/ChatPage'; // Used for the community chat integration test

test.describe.serial('Biggie AI Functionality', () => {
  let biggiePage: BiggiePage;

  test.beforeEach(async ({ page }) => {
    biggiePage = new BiggiePage(page);
  });

  test('TC-AI-001: Direct Inquiry to Biggie', async ({ page }) => {
    await biggiePage.navigateToBiggieHub();
    await biggiePage.startNewChat();

    // Count the messages BEFORE we send anything
    const beforeCount = await biggiePage.allMessages.count();

    const prompt = 'What are the current Premier League standings?';
    await biggiePage.promptBiggie(prompt);

    // Playwright's toHaveCount will automatically retry checking the DOM until it hits the timeout!
    // We expect the count to increase by 2: (1) The user's prompt bubble + (2) The AI's response bubble
    await expect(biggiePage.allMessages).toHaveCount(beforeCount + 2, { timeout: 15000 });
  });

  // TC-AI-002 (Streaming Response Indicator) skipped per user instruction.

  test('TC-AI-003: Conversation History Persistence', async ({ page }) => {
    await biggiePage.navigateToBiggieHub();
    await biggiePage.startNewChat();

    const uniquePrompt = `Who won the Premier League in 2023? ${Date.now()}`;
    await biggiePage.promptBiggie(uniquePrompt);
    await biggiePage.waitForAiResponse();

    // Navigate away to Home
    await page.goto('/');
    await expect(page).toHaveURL('/');

    // Return to /chats
    // Use the custom navigation function which ensures the inputs have loaded
    await biggiePage.navigateToBiggieHub();

    // Verify the previous conversation is saved and accessible.
    // In the DOM provided, the chat history list is a series of button elements inside the scrollable container.
    // The very first button is always the most recent conversation!
    const mostRecentChat = biggiePage.chatHistoryList.first();
    
    // First verify the button actually shows up in the sidebar
    await expect(mostRecentChat).toBeVisible({ timeout: 10000 });
    await mostRecentChat.click();

    // Verify the main chat feed contains the user prompt
    // Rather than restricting perfectly to the message nodes (which might take a second to render or have different classes on history load),
    // we assert that the unique prompt appears ANYWHERE in the main document body after clicking the history tab.
    await expect(page.locator('body')).toContainText(uniquePrompt, { timeout: 15000 });
  });
  test('TC-AI-004: Send Button is Non-Functional (Bug)', async ({ page }) => {
    await biggiePage.navigateToBiggieHub();
    await biggiePage.startNewChat();
    
    // Count the messages BEFORE we send anything
    const beforeCount = await biggiePage.allMessages.count();
    
    // Fill the input with text
    await biggiePage.chatInput.fill('This is a test of the send button.');
    
    // Click the visual Send arrow button instead of pressing Enter
    await biggiePage.sendButton.click();
    
    // Wait for a short period to allow for any potential UI reaction
    await page.waitForTimeout(2000);
    
    // Assert that the message count has NOT increased, proving the button failed to send the text
    await expect(biggiePage.allMessages).toHaveCount(beforeCount);
    
    // As a secondary check, verify the input field still contains the text (it wasn't cleared by sending)
    await expect(biggiePage.chatInput).toHaveValue('This is a test of the send button.');
  });

});
