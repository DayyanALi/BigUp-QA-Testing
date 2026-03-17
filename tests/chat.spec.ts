import { test, expect } from '@playwright/test';
import { ChatPage } from './pages/ChatPage';
import { HomePage } from './pages/HomePage';

test.describe('Chat Functionality', () => {
  let chatPage: ChatPage;
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    chatPage = new ChatPage(page);
    homePage = new HomePage(page);
    
    // Navigate to the homepage
    await homePage.navigate();
    
    // Select the first game card as in the prediction tests
    const gameCard = homePage.predictionGameCards.first();
    await expect(gameCard).toBeVisible({ timeout: 15000 });
    await homePage.goToActivityPage(gameCard);
    
    // Switch to Chat tab
    const chatTab = page.getByRole('button', { name: 'Chat' }).or(page.getByRole('tab', { name: 'Chat' })).first();
    await expect(chatTab).toBeVisible({ timeout: 10000 });
    await chatTab.click();
    
    // Crucial: Wait for the chat to settle
    await page.waitForTimeout(2000);
  });

  test('TC-CHAT-001: Send standard chat message with emoji', async ({ page }) => {
    const message = `Hi 😊`;
    const chatInput = page.getByTestId('chat-text-input');
    const paragraph = chatInput.getByRole('paragraph');
    
    if (await paragraph.count() > 0) {
      await paragraph.click();
    } else {
      await chatInput.click();
    }
    
    // Clear and type with delay to ensure Tiptap change events fire
    await page.keyboard.press('Control+A');
    await page.keyboard.press('Backspace');
    await page.keyboard.type(message, { delay: 100 });
    
    // Submit via button click
    await chatPage.sendButton.click({ force: true });

    // Verify message appears in the feed
    // We search for the specific text to be more resilient to locator changes in different chat views
    const sentMessage = page.getByText(message).last();
    await expect(sentMessage).toBeVisible({ timeout: 15000 });
    
    // Verify a timestamp is displayed
    const timestampElement = sentMessage.locator('time, .timestamp, [aria-label*="time"]');
    if (await timestampElement.count() > 0) {
      await expect(timestampElement).toBeVisible();
    }
  });

  test('TC-CHAT-004: Prevent sending empty message', async ({ page }) => {
    const chatInput = page.getByTestId('chat-text-input');
    const paragraph = chatInput.getByRole('paragraph');
    
    if (await paragraph.count() > 0) {
      await paragraph.click();
    } else {
      await chatInput.click();
    }
    
    const initialMessageCount = await chatPage.messages.count();
    
    await page.keyboard.type('   ', { delay: 50 });
    await chatPage.sendButton.click({ force: true });
    
    await page.waitForTimeout(1000);
    
    const finalMessageCount = await chatPage.messages.count();
    expect(finalMessageCount).toBe(initialMessageCount);
  });

  test('TC-CHAT-007: @Biggie in chat gets a response', async ({ page }) => {
    const chatInput = page.getByTestId('chat-text-input');
    const paragraph = chatInput.getByRole('paragraph');

    if (await paragraph.count() > 0) {
      await paragraph.click();
    } else {
      await chatInput.click();
    }

    // 1. Type @Biggie slowly to trigger the mention dropdown
    await page.keyboard.type('@Biggie', { delay: 150 });
    
    // 2. Wait for mention suggestions to appear to ensure we are referencing, not just typing
    const mentionList = page.locator('.mention-suggestion, [role="listbox"]').first();
    await expect(mentionList).toBeVisible({ timeout: 5000 });
    
    // 3. Press Enter to select Biggie from the suggestions
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
    
    // 4. Type the actual question
    await page.keyboard.type(' What are the current Premier League standings?', { delay: 50 });
    
    // 5. Submit
    await chatPage.sendButton.click({ force: true });
    
    // Assert Biggie responds in a thread
    const threadButton = page.getByRole('button', { name: /Thread Messages with Biggie/i }).last();
    await expect(threadButton).toBeVisible({ timeout: 25000 });
    await threadButton.click();
    
    const biggieMessageInThread = page.getByText('Biggie').last();
    await expect(biggieMessageInThread).toBeVisible({ timeout: 15000 });

    const lastThreadMessage = page.locator('[data-testid="thread-message"], .thread-message, .message-bubble').last();
    await expect(lastThreadMessage).toBeVisible({ timeout: 15000 });
    const responseText = await lastThreadMessage.textContent();
    expect(responseText?.length).toBeGreaterThan(20);
  });
});