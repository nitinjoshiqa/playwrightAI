import { ElementActions } from '../core/ElementActions';
import type { Pages } from '../pages';

export async function checkoutFlow(actions: ElementActions, pages: Pages, firstName: string, lastName: string, postalCode: string) {
  await actions.click(pages.inventory.cartButton);
  await actions.click(pages.cart.checkoutButton);
  await actions.type(pages.checkout.firstName, firstName);
  await actions.type(pages.checkout.lastName, lastName);
  await actions.type(pages.checkout.postalCode, postalCode);
  await actions.click(pages.checkout.continueButton);
}
