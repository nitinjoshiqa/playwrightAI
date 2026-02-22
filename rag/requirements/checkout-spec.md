# Checkout and Order Completion Requirements

As a user, I want to complete a purchase and see a confirmation so I know my order was placed.

## AC1: Complete order with valid information
- Given I am logged in and have a backpack in my cart
- When I proceed to checkout and enter First Name 'John', Last Name 'Doe', Postal Code '12345'
- And I click the continue button
- And I click the finish button on the order summary page
- Then I should see a thank you confirmation message
- And the order completion page should display

## AC2: Cart shows item count badge
- Given I am logged in and viewing the inventory
- When I add an item to the cart
- Then the shopping cart icon should display a badge with the item count
- And the count should increment when I add additional items

## AC3: Remove item from cart
- Given I am on the cart page with items in my cart
- When I click the remove button for an item
- Then that item should no longer appear in the cart
- And the item count badge should update accordingly
