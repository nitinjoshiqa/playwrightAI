# Login Feature Requirements

As a user, I want to log in with valid credentials so I can access the inventory system.

## AC1: Valid login with standard user
- Given I am on the login page
- When I enter username 'standard_user' and password 'secret_sauce'
- Then I should be redirected to the inventory page
- And I should see the products list

## AC2: Invalid login shows error message
- Given I am on the login page
- When I enter an invalid username or password
- Then I should see an error message displayed
- And I should remain on the login page

## AC3: Locked user cannot log in
- Given I am on the login page
- When I attempt to log in with username 'locked_out_user'
- Then I should see a "user has been locked out" error message
- And I should not be able to proceed to inventory
