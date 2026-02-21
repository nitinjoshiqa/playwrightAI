import { ElementActions } from '../core/ElementActions';
import type { Pages } from '../pages';
import { userLoggedIn } from './userLoggedIn';
import { addItemToCartFlow } from '../flows/addItemToCartFlow';

export async function userHasItemInCart(actions: ElementActions, pages: Pages, itemName: string) {
  await userLoggedIn(actions, pages);
  await addItemToCartFlow(actions, pages, itemName);
}
