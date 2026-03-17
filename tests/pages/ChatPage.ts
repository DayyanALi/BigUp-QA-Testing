import { Page, Locator, expect } from '@playwright/test';

export class ChatPage {
  readonly page: Page;
  readonly chatInput: Locator;
  readonly sendButton: Locator;
  readonly emojiPickerButton: Locator;
  readonly chatFeed: Locator;
  readonly messages: Locator;
  
  constructor(page: Page) {
    this.page = page;
    
    // Locators for the chat components. Given we are building this dynamically,
    // we use robust semantic locators where possible.
    // The user can adjust placeholders/names if the actual UI differs slightly.
    
    // Chat input usually is a textbox with a relevant placeholder
    this.chatInput = this.page.getByRole('textbox', { name: /message|chat/i }).or(this.page.locator('textarea, input[type="text"]').last());
    
    // Send button
    this.sendButton = this.page.getByRole('button', { name: /send/i })
      .or(this.page.locator('[aria-label*="Send" i]'))
      .or(this.page.locator('button[type="submit"]'))
      .or(this.page.locator('button:has(svg)').last());
    
    // Emoji button
    this.emojiPickerButton = this.page.getByRole('button', { name: /emoji/i }).or(this.page.locator('[aria-label="Choose emoji"]'));
    
    // The feed containing the messages
    this.chatFeed = this.page.getByRole('log').or(this.page.locator('[aria-label="Chat messages"]'));
    
    // Individual messages
    this.messages = this.page.locator('[data-testid="message-bubble"], .message, [role="listitem"], .tifo-line-clamp-2, button:has(span > span)');
  }

  /**
   * Navigate to a specific community's chat lobby (e.g., '/alias')
   */
  async navigateToCommunityChat(communityId: string) {
    await this.page.goto(`/${communityId}`);
    // Optional: wait for the chat input to be visible to ensure the chat has loaded
    await this.chatInput.waitFor({ state: 'visible' });
  }

  /**
   * Enter text into the chat input
   */
  async enterMessage(text: string) {
    await this.chatInput.fill(text);
  }

  /**
   * Click the send button to submit the message (or press enter)
   */
  async send() {
    // Prefer pressing Enter to submit chat since it avoids finding ambiguous icon buttons
    await this.chatInput.press('Enter');
  }

  /**
   * Type text and immediately send it using the keyboard
   */
  async typeAndSend(text: string) {
    await this.chatInput.fill(text);
    await this.chatInput.press('Enter');
  }

  /**
   * Click the reply button on the last sent message
   */
  async clickReplyOnLastMessage() {
    const lastMessage = this.messages.last();
    // Hover over the message to reveal the reply button if it's hidden behind a hover state
    await lastMessage.hover();
    const replyButton = lastMessage.getByRole('button', { name: /reply/i }).or(lastMessage.locator('[aria-label="Reply"]'));
    await replyButton.click();
  }
}
