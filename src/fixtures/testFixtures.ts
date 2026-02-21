import { test as base } from '@playwright/test';
import { ElementActions } from '../core/ElementActions';
import { pages } from '../pages';

type Fixtures = {
  actions: ElementActions;
  pages: typeof pages;
};

export const test = base.extend<Fixtures>({
  actions: async ({ page }, use) => {
    const actions = new ElementActions(page);
    await use(actions);
  },
  pages: async ({}, use) => {
    await use(pages);
  }
});

export { expect } from '@playwright/test';
