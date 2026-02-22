import { test as base } from '@playwright/test';
import { ElementActions } from '../core/ElementActions';
import { pages } from '../pages';
import { createRagPlugin } from '../rag/factory';
import { IRAGPlugin } from '../rag/core';

type Fixtures = {
  actions: ElementActions;
  pages: typeof pages;
  rag: IRAGPlugin | null;
};

export const test = base.extend<Fixtures>({
  actions: async ({ page, rag }, use) => {
    const actions = new ElementActions(page, undefined, rag || undefined);
    await use(actions);
  },
  pages: async ({}, use) => {
    await use(pages);
  },
  rag: async ({}, use) => {
    let plugin: IRAGPlugin | null = null;
    try {
      plugin = await createRagPlugin();
    } catch (err) {
      console.warn('⚠️  RAG plugin initialization failed:', err);
      plugin = null;
    }
    
    await use(plugin);
    
    if (plugin) {
      await plugin.close();
    }
  },
});

export { expect } from '@playwright/test';
