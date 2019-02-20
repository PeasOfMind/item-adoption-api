# Item Adoption API - Work in Progress

This is the API backend for the Item Adoption App:

Client code: https://github.com/PeasOfMind/item-adoption-client

Live app (and base URL): https://warm-thicket-79199.herokuapp.com/

### HTTP Verbs:

Client accesses the database of active listings and wishlists at {baseURL}/api/lists

### Supports the following requests:


| HTTP METHOD | POST            | GET       | PUT         | DELETE |
| ----------- | --------------- | --------- | ----------- | ------ |
| CRUD OP     | CREATE          | READ      | UPDATE      | DELETE |
| /listings   | Create new listing | Get your active listings | N/A | N/A |
| /wishlist   | Create new wish item | Get your wishlist | N/A | N/A |
| /listings/:zipcode   | N/A | Get all other listings in your area | N/A | N/A |
| /wishlist/:zipcode   | N/A | Get all other wishlists in your area | N/A | N/A |
| /listings/:id   | N/A | N/A | Edit listing | Delete listing |
| /wishlist/:id   | N/A | N/A | Edit wish item | Delete wish item |

Authentication is required for all requests.