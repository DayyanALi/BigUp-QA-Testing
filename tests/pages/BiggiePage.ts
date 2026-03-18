import { Page, Locator, expect } from '@playwright/test';

export class BiggiePage {
  readonly page: Page;
  readonly newChatButton: Locator;
  readonly chatInput: Locator;
  readonly sendButton: Locator;
  readonly aiResponses: Locator;
  readonly allMessages: Locator;
  readonly chatHistoryList: Locator;
  
  constructor(page: Page) {
    this.page = page;
    
    // "New chat" button in the sidebar or main view
    this.newChatButton = this.page.getByRole('button', { name: /new chat/i }).or(this.page.locator('text="New Chat"'));
    
    // Chat input
    // Using getByPlaceholder is Playwright's recommended approach for robustly finding inputs.
    this.chatInput = this.page.getByPlaceholder(/Ask Biggie a question/i)
      .or(this.page.locator('div:has(input) input'));
    
    // Send button
    this.sendButton = this.page.getByRole('button', { name: /send/i })
      .or(this.page.locator('button:has(path[d*="M5.91494 1.25V12.75"])'))
      .or(this.page.locator('[aria-label*="Send" i]'))
      .or(this.page.locator('button[type="submit"]'))
      .or(this.page.locator('button:has(svg)').last())
    
    // AI Responses
    // Given the UI shows Biggie responding, we search for the response wrapper by looking for the Biggie avatar/header,
    // or simply by selecting the paragraphs within the main chat area that contain the response.
    this.aiResponses = this.page.locator('.tifo-flex:has(> img[alt*="Biggie"], > svg) + div')
      .or(this.page.locator('p:text-matches(".{20,}", "g")')) // Any long paragraph/response in the chat
      .or(this.page.locator('[data-testid="ai-response"], .ai-message, .bot-message'))
      .or(this.page.locator('[role="listitem"]').filter({ hasText: /Biggie/i }));
      
    // A generic locator targeting the direct children of the scrollable container (the message wrappers)
    // We explicitly filter out ANY temporary loading state block. We know loading blocks contain
    // animated dots (e.g. "..."), so we filter out nodes that contain the ellipsis or text like "thinking" / "grabbing"
    this.allMessages = this.page.locator('.tifo-overflow-auto > div')
      .filter({ hasNotText: /\.\.\.|thinking|grabbing|loading/i });
    
    // Chat history list items in the sidebar
    // Based on the DOM seen: A scrolling flex container holds several <button> elements.
    // IMPERATIVE: We must explicitly filter out the "New chat" button, as it shares the same container!
    this.chatHistoryList = this.page.locator('.tifo-overflow-auto > button')
      .filter({ hasNotText: /new chat/i });
  }

  /**
   * Navigate to the direct Biggie chat hub
   */
  async navigateToBiggieHub() {
    await this.page.goto('/chats');
    await this.chatInput.waitFor({ state: 'visible' });
  }

  /**
   * Click New Chat to clear context or start a fresh thread
   */
  async startNewChat() {
    if (await this.newChatButton.isVisible()) {
      await this.newChatButton.click();
    }
  }

  /**
   * Submit a prompt to Biggie
   */
  async promptBiggie(text: string) {
    await this.chatInput.fill(text);
    // Prefer pressing Enter to submit chat since it's universally supported and avoids finding ambiguous icon buttons
    await this.chatInput.press('Enter');
  }

  /**
   * Wait for the AI response to finish generating
   * (Since we are skipping the streaming UI test, we just wait for the response bubble to stabilize)
   */
  async waitForAiResponse() {
    // Wait for at least one AI response to be visible
    await this.aiResponses.last().waitFor({ state: 'visible', timeout: 30000 });
    // In a real scenario, you'd wait for a streaming indicator to detach. 
    // Example: await this.page.locator('.typing-indicator').waitFor({ state: 'hidden' });
  }
}
