import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { IRAGPlugin } from '../rag/core';

export class ElementActions {
  readonly page: Page;

  constructor(page: Page, private reporter?: (log: string) => void, private rag?: IRAGPlugin) {
    this.page = page;
  }

  async click(selector: string): Promise<void> {
    try {
      await this.page.locator(selector).click();
    } catch (err) {
      // OP 3: Failure analysis
      if (this.rag) {
        const analysis = await this.rag.analyzeFailure((err as Error).message);
        console.log(`💡 RAG Suggestion: ${analysis.suggestion}`);
        
        if (analysis.retry) {
          const wait = analysis.waitMs || 500;
          console.log(`   Retrying after ${wait}ms...`);
          await new Promise(r => setTimeout(r, wait));
          return this.click(selector);
        }
      }
      throw err;
    }
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

  async waitForVisible(selector: string, timeout?: number) {
    // OP 3: Smart wait time estimation
    if (!timeout && this.rag) {
      try {
        timeout = await this.rag.estimateWaitTime(selector);
        console.log(`⏱️  RAG estimated wait: ${timeout}ms for ${selector}`);
      } catch (err) {
        console.warn('⚠️  RAG wait estimation failed:', err);
        timeout = 5000;
      }
    }

    await this.page.locator(selector).waitFor({ 
      state: 'visible', 
      timeout: timeout || 5000 
    });
  }
}
