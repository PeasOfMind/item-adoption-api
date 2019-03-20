# Item Adoption API

This is the API backend for the Item Adoption App:

Client code: https://github.com/PeasOfMind/item-adoption-client

Live app: https://pacific-savannah-70762.herokuapp.com/

## HTTP Verbs:

baseURL: https://sleepy-scrubland-39053.herokuapp.com/

Client accesses the database of active listings and wishlists at {baseURL}/api/lists

### Supports the following requests:


| HTTP METHOD | POST            | GET       | PUT         | DELETE |
| ----------- | --------------- | --------- | ----------- | ------ |
| CRUD OP     | CREATE          | READ      | UPDATE      | DELETE |
| /listings   | Create new listing | Get your active listings | N/A | N/A |
| /wishlist   | Create new wish item | Get your wishlist | N/A | N/A |
| /listings/:id   | N/A | N/A | Edit listing | Delete listing |
| /wishlist/:id   | N/A | N/A | Edit wish item | Delete wish item |
| /listings/search/:zipcode   | N/A | Get all other listings in your area | N/A | N/A |
| /wishlist/search/:zipcode   | N/A | Get all other wishlists in your area | N/A | N/A |
| /listings/contact/:itemId   | Email user about listing | N/A | N/A | N/A |
| /wishlist/contact/:itemId   | Email user about item | N/A | N/A | N/A |

## Authentication

An athentication token is required for all requests & is provided by either:

Logging in (POST) at {baseURL}/api/auth/login 

Registering (POST) at {baseURL}/api/users

Persistence in local storage is supported

---
Built with: Javascript (Node.js), Express, Mongoose, MongoDB, Passport

## Goals for Future Versions
Support a more robust search in area feature. Current version only supports exact match of zipcode.

Add ability to search for thrift shops and/or donation centers in area
