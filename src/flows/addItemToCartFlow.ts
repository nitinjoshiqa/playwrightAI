import { ElementActions } from '../core/ElementActions';
import type { Pages } from '../pages';

export async function addItemToCartFlow(actions: ElementActions, pages: Pages, itemName: string) {
  const addBtn = pages.inventory.addToCartButton(itemName);
  await actions.waitForVisible(addBtn);
  await actions.click(addBtn);
}
