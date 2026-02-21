import { test, expect } from '../src/fixtures/testFixtures';
import { userHasItemInCart } from '../src/preconditions/userHasItemInCart';
import { checkoutFlow } from '../src/flows/checkoutFlow';
import { completeOrderFlow } from '../src/flows/completeOrderFlow';
import { userLoggedIn } from '../src/preconditions/userLoggedIn';
import { addItemToCartFlow } from '../src/flows/addItemToCartFlow';

test('successful order placement', async ({ actions, pages }) => {
  await userHasItemInCart(actions, pages, 'Sauce Labs Backpack');
  await checkoutFlow(actions, pages, 'John', 'Doe', '90210');
  await completeOrderFlow(actions, pages);
  await actions.waitForVisible(pages.checkoutComplete.completeHeader);
  const header = await actions.getText(pages.checkoutComplete.completeHeader);
  expect(header.toLowerCase()).toContain('thank you');
});

test('cart badge increments when item added', async ({ actions, pages }) => {
  await userLoggedIn(actions, pages);
  await addItemToCartFlow(actions, pages, 'Sauce Labs Backpack');
  await actions.waitForVisible(pages.inventory.cartBadge, 10_000);
  const badge = await actions.getText(pages.inventory.cartBadge);
  expect(Number(badge)).toBeGreaterThanOrEqual(1);
});
