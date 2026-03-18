import { test, expect } from '@playwright/test';
import { ChatPage } from './pages/ChatPage';
import { HomePage } from './pages/HomePage';

test.describe('Chat Functionality', () => {
  let chatPage: ChatPage;
  let homePage: HomePage;

  test.beforeEach(async ({ page }) => {
    test.setTimeout(60000); // 60s for slow media/backend sync
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
  // Unique message with timestamp to prevent false matches
  const message = `Hi 😊 ${Date.now()}`;

  // Find the tiptap input
  const chatInput = page.getByTestId('chat-text-input');
  const paragraph = chatInput.getByRole('paragraph');

  if (await paragraph.count() > 0) {
    await paragraph.click();
  } else {
    await chatInput.click();
  }

  // Clear any existing text and type message
  await page.keyboard.press('Control+A');
  await page.keyboard.press('Backspace');
  await page.keyboard.type(message, { delay: 50 });

  // Press Enter to send (more reliable than clicking send button for tiptap)
  await page.keyboard.press('Enter');

  // 1. Assert input is cleared after sending — proves send actually fired
  await expect(paragraph).toBeEmpty({ timeout: 5000 });

  // 2. Assert message appears in the chat feed specifically
  // Using chatPage.messages scopes to the feed, not the whole page
  const sentMessage = chatPage.messages.filter({ hasText: message }).last();
  await expect(sentMessage).toBeVisible({ timeout: 15000 });

  // 3. Assert the message contains the emoji specifically
  await expect(sentMessage).toContainText('😊');
});

  test('TC-CHAT-002: Prevent sending empty message', async ({ page }) => {
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

  test('TC-CHAT-003: @Biggie in chat gets a response', async ({ page }) => {
  const chatInput = page.getByTestId('chat-text-input');

  // Click the outer container to focus the Tiptap editor
  await chatInput.click();
  await page.waitForTimeout(300);

  // Type directly into the container
  await chatInput.pressSequentially('@Biggie', { delay: 100 });
  await chatInput.press('Enter');
  await chatInput.pressSequentially(' What are the current Premier League standings?', { delay: 100 });

  // Submit via Enter
  await chatInput.press('Enter');

  // 1. Assert YOUR message appears in chat first
  const sentMessage = chatPage.messages
    .filter({ hasText: /Premier League standings/i }).last();
  await expect(sentMessage).toBeVisible({ timeout: 10000 });

  // 2. Assert thread button appears — proves Biggie responded
  const threadButton = page.locator('a, button, [role="button"], div')
    .filter({ hasText: /Thread Messages with Biggie/i }).last();
  await expect(threadButton).toBeVisible({ timeout: 30000 }); 
  await threadButton.click();

  // 3. Assert Biggie's name appears as sender in thread
  const biggieSender = page.locator('[class*="message"], [class*="thread"]')
    .filter({ hasText: 'Biggie' }).last();
  await expect(biggieSender).toBeVisible({ timeout: 15000 });

  // 4. Assert response has actual content
  const responseText = await biggieSender.textContent();
  expect(responseText?.length).toBeGreaterThan(20);

});
});