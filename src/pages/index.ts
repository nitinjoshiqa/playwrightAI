import { loginPage } from './login';
import { inventoryPage } from './inventory';
import { cartPage } from './cart';
import { checkoutPage } from './checkout';
import { checkoutOverviewPage } from './checkoutOverview';
import { checkoutCompletePage } from './checkoutComplete';

export const pages = {
  login: loginPage,
  inventory: inventoryPage,
  cart: cartPage,
  checkout: checkoutPage,
  checkoutOverview: checkoutOverviewPage,
  checkoutComplete: checkoutCompletePage
} as const;

export type Pages = typeof pages;
