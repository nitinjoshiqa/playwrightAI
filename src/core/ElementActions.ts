import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

export class ElementActions {
  readonly page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async click(selector: string) {
    await this.page.locator(selector).click();
  }

  async type(selector: string, text: string) {
    await this.page.locator(selector).fill(text);
  }

  async getText(selector: string) {
    return await this.page.locator(selector).innerText();
  }

  async assertText(selector: string, expected: string) {
    await expect(this.page.locator(selector)).toHaveText(expected);
  }

  async waitForVisible(selector: string, timeout = 5000) {
    await this.page.locator(selector).waitFor({ state: 'visible', timeout });
  }
}
