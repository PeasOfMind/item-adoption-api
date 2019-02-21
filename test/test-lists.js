const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
const faker = require('faker');

const {app, runServer, closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');
const {List} = require('../lists');

const expect = chai.expect;
chai.use(chaiHttp);

let user = {
    username: null,
    authToken: null,
    id: null
}

const testZip = faker.address.zipCode('#####');

function seedDatabase(){
    //generate a bunch of listings and wishlists associated with different users
    const seedData = [...generateListingData(5, user), ...generateWishListData(5, user),...generateListingData(6), ...generateWishListData(6)];
    return List.insertMany(seedData);
}

function generateListingData(quantity, user){
    const listings = [];
    for (let i=0; i<quantity; i++){
        //if a user is not supplied, generate one using faker
        if (!user) user = faker.internet.userName();
        const dateCreated = faker.date.recent(12);
        expirationDate = new Date(dateCreated.getTime() + 14*24*60*60*1000);
        listings.push({
            user: user.id,
            title: faker.random.words(),
            description: faker.lorem.sentence(),
            price: faker.random.number(),
            expirationDate,
            zipcode: testZip
        });
    }
    return listings;
}

function generateWishListData(quantity, user){
    const wishlist = [];
    for (let i=0; i<quantity; i++){
        //if a user is not supplied, generate one using faker
        if (!user) user = faker.internet.userName();
        wishlist.push({
            user: user.id,
            title: faker.random.words(),
            isWishlist: true
        });
    }
    return wishlist
}

function tearDownDb(){
    console.warn('Deleting database');
    return mongoose.connection.dropDatabase();
}

describe('/api/lists', function(){
    const username = 'testUser';
    const password = 'testPass123';

    before(function(){
        return runServer(TEST_DATABASE_URL);
    });

    beforeEach(function(){
        //create the user and save the authToken to validate each request
        return chai.request(app)
        .post('/api/users')
        .send({username, password})
        .then(response => {
            user.username = response.body.username;
            user.authToken = response.body.authToken;
            user.id = response.body.id;
        })
        .then(() => {
            return seedDatabase();
        });
    })

    afterEach(function (){
        return tearDownDb();
    })

    after(function(){
        return closeServer();
    });

    describe('GET listings endpoint', function(){
        it('should retrieve all active item listings for specified user', function(){
            let res;
            return chai.request(app)
            .get('/api/lists/listings')
            .set('Authorization', `Bearer ${user.authToken}`)
            .then(function(_res){
                res = _res;
                expect(res).to.have.status(200);
                expect(res.body.listings).to.have.lengthOf.at.least(1);
                return List.countDocuments({user: user.id, isWishlist: false});
            })
            .then(function(count){
                console.log(count);
                expect(res.body.listings).to.have.lengthOf(count);
            });
        });

        it('should return active listings with the right fields', function(){
            let resListing;
            return chai.request(app)
            .get('/api/lists/listings')
            .set('Authorization', `Bearer ${user.authToken}`)
            .then(function(res){
                expect(res).to.have.status(200);
                expect(res).to.be.json;
                expect(res.body.listings).to.be.an('array');
                res.body.listings.forEach(listing => {
                    expect(listing).to.be.an('object');
                    expect(listing).to.include.keys('id', 'title', 'price', 'description', 'expiresIn', 'editing', 'user', 'zipcode');
                })
                resListing = res.body.listings[0];
                return List.findById(resListing.id);
            })
            .then(function(listing){
                expect(resListing.id).to.equal(listing.id);
                expect(resListing.title).to.equal(listing.title);
                expect(resListing.editing).to.equal(listing.editing);
                expect(resListing.description).to.equal(listing.description);
                expect(resListing.price).to.equal(listing.price);
                expect(resListing.user).to.equal(listing.user);
            });
        }); 
    });

    describe('GET wishlist endpoint', function(){
        it('should retrieve all wish list items', function(){
            let res;
            return chai.request(app)
            .get('/api/lists/wishlist')
            .set('Authorization', `Bearer ${user.authToken}`)
            .then(function(_res){
                res = _res;
                expect(res).to.have.status(200);
                expect(res.body.wishlist).to.have.lengthOf.at.least(1);
                return List.count({user: user.id, isWishlist: true});
            })
            .then(function(count){
                expect(res.body.wishlist).to.have.lengthOf(count);
            });
        });

        it('should return wish items with the right fields', function(){
            let resWishItem;
            return chai.request(app)
            .get('/api/lists/wishlist')
            .set('Authorization', `Bearer ${user.authToken}`)
            .then(function(res){
                expect(res).to.have.status(200);
                expect(res).to.be.json;
                expect(res.body.wishlist).to.be.an('array');
                res.body.wishlist.forEach(wishItem => {
                    expect(wishItem).to.be.an('object');
                    expect(wishItem).to.include.keys('id', 'title', 'editing', 'dateCreated', 'user', 'zipcode')
                });
                resWishItem = res.body.wishlist[0];
                return List.findById(resWishItem.id);
            })
            .then(function(wishItem){
                expect(resWishItem.id).to.equal(wishItem.id);
                expect(resWishItem.title).to.equal(wishItem.title);
                expect(resWishItem.user).to.equal(wishItem.user);
                expect(resWishItem.editing).to.equal(wishItem.editing);
            });
        });
    });

    describe('GET all listings in area endpoint', function(){
        it('should retrieve active item listings in user area not including user entries', function(){
            let res;
            return chai.request(app)
            .get(`/api/lists/listings/${testZip}`)
            .set('Authorization', `Bearer ${user.authToken}`)
            .then(function(_res){
                res = _res;
                expect(res).to.have.status(200);
                expect(res.body.listings).to.have.lengthOf.at.least(1);
                return List.count({isWishlist: false, zipcode: testZip, user: {$ne: user.id}});
            })
            .then(function(count){
                expect(res.body.listings).to.have.lengthOf(count);
            });
        });

        it('should return active listings in user area with the right fields', function(){
            let resListing;
            return chai.request(app)
            .get(`/api/lists/listings/${testZip}`)
            .set('Authorization', `Bearer ${user.authToken}`)
            .then(function(res){
                expect(res).to.have.status(200);
                expect(res).to.be.json;
                expect(res.body.listings).to.be.an('array');
                res.body.listings.forEach(listing => {
                    expect(listing).to.be.an('object');
                    expect(listing).to.include.keys('id', 'title', 'price','description', 'expiresIn', 'editing', 'user', 'zipcode');
                })
                resListing = res.body.listings[0];
                return List.findById(resListing.id);
            })
            .then(function(listing){
                expect(resListing.id).to.equal(listing.id);
                expect(resListing.title).to.equal(listing.title);
                expect(resListing.price).to.equal(listing.price);
                expect(resListing.editing).to.equal(listing.editing);
                expect(resListing.description).to.equal(listing.description);
                expect(resListing.user).to.equal(listing.user);
            });
        }); 
    })

    describe('GET all wishlists in area endpoint', function(){
        it('should retrieve all wishlists in user area not including user entries', function(){
            let res;
            return chai.request(app)
            .get(`/api/lists/wishlist/${testZip}`)
            .set('Authorization', `Bearer ${user.authToken}`)
            .then(function(_res){
                res = _res;
                expect(res).to.have.status(200);
                expect(res.body.wishlist).to.have.lengthOf.at.least(1);
                return List.count({isWishlist: true, zipcode: testZip, user: {$ne: user.username}});
            })
            .then(function(count){
                expect(res.body.wishlist).to.have.lengthOf(count);
            });
        });

        it('should return wish items with the right fields', function(){
            let resWishItem;
            return chai.request(app)
            .get(`/api/lists/wishlist/${testZip}`)
            .set('Authorization', `Bearer ${user.authToken}`)
            .then(function(res){
                expect(res).to.have.status(200);
                expect(res).to.be.json;
                expect(res.body.wishlist).to.be.an('array');
                res.body.wishlist.forEach(wishItem => {
                    expect(wishItem).to.be.an('object');
                    expect(wishItem).to.include.keys('id', 'title', 'editing', 'dateCreated', 'user', 'zipcode')
                });
                resWishItem = res.body.wishlist[0];
                return List.findById(resWishItem.id);
            })
            .then(function(wishItem){
                expect(resWishItem.id).to.equal(wishItem.id);
                expect(resWishItem.title).to.equal(wishItem.title);
                expect(resWishItem.user).to.equal(wishItem.user);
                expect(resWishItem.editing).to.equal(wishItem.editing);
            });
        });
    })

    describe('POST listing endpoint', function(){
        it('should add a new item listing', function(){
            //just generate one listing.
            const newListing = {
                user: user.username,
                title: 'Coffee Table',
                description: 'glass, durable, no scratches, like new',
                price: 50,
                zipcode: testZip
            }
            return chai.request(app)
            .post('/api/lists/listings')
            .set('Authorization', `Bearer ${user.authToken}`)
            .send(newListing)
            .then(function(res){
                expect(res).to.have.status(201);
                expect(res).to.be.json;
                expect(res.body).to.be.an('object');
                expect(res.body).to.include.keys('id', 'title', 'description', 'price', 'dateCreated', 'expiresIn', 'editing', 'user', 'zipcode');
                expect(res.body.id).to.be.a('string');
                expect(res.body.title).to.equal(newListing.title);
                expect(res.body.description).to.equal(newListing.description);
                expect(res.body.price).to.equal(newListing.price);
                expect(res.body.expiresIn).to.equal(14);
                expect(res.body.editing).to.be.false;
                expect(res.body.user).to.equal(user.username);
            });
        });
        
    });
    
    describe('POST wish item endpoint', function(){
        it('should add a new wishlist item', function(){
            //just generate one wishlist item. Should be the first one in the wishlist array.
            const newWishItem = generateWishListData(1)[0];
            return chai.request(app)
            .post('/api/lists/wishlist')
            .set('Authorization', `Bearer ${user.authToken}`)
            .send(newWishItem)
            .then(function(res){
                expect(res).to.have.status(201);
                expect(res).to.be.json;
                expect(res.body).to.be.an('object');
                expect(res.body).to.include.keys('id', 'title', 'dateCreated','editing', 'user', 'zipcode');
                expect(res.body.id).to.be.a('string');
                expect(res.body.title).to.equal(newWishItem.title);
                expect(res.body.editing).to.be.false;
                expect(res.body.user).to.equal(user.username);
            });
        });
    });

    describe('PUT listing endpoint', function(){
        it('should edit an existing listing', function(){
            const updateData = {
                title: "Wooden Chairs, Set of 6",
                description: "Some scratches and some chairs have a slight wobble but otherwise durable",
                price: 100,
                zipcode: 11238
            };
            return List.findOne({isWishlist: false})
            .then(function(listing){
                updateData.id = listing.id;
                return chai.request(app)
                .put(`/api/lists/listings/${updateData.id}`)
                .set('Authorization', `Bearer ${user.authToken}`)
                .send(updateData);
            })
            .then(function(res){
                expect(res).to.have.status(204);
                return List.findById(updateData.id);
            })
            .then(function(listing){
                expect(listing.title).to.equal(updateData.title);
                expect(listing.description).to.equal(updateData.description);
                expect(listing.price).to.equal(updateData.price);
                expect(listing.zipcode).to.equal(updateData.zipcode);
                //editing should be toggled to false when request is submitted.
                expect(listing.editing).to.be.false;
            });
        });
    });

    describe('PUT wish item endpoint', function(){
        it('should edit an existing wish item', function(){
            const updateData = {
                title: "Queen mattress"
            };
            return List.findOne({isWishlist: true})
            .then(function(wishItem){
                updateData.id = wishItem.id;
                return chai.request(app)
                .put(`/api/lists/wishlist/${updateData.id}`)
                .set('Authorization', `Bearer ${user.authToken}`)
                .send(updateData);
            })
            .then(function(res){
                expect(res).to.have.status(204);
                return List.findById(updateData.id);
            })
            .then(function(wishItem){
                expect(wishItem.title).to.equal(updateData.title);
                //editing should be toggled to false when request is submitted.
                expect(wishItem.editing).to.be.false;
            });
        });
    });

    describe('DELETE listing endpoint', function(){
        it('should delete a listing by id', function(){
            let listing;
            return List.findOne({isWishlist: false})
            .then(function(_listing){
                listing = _listing;
                return chai.request(app)
                .delete(`/api/lists/listings/${listing.id}`)
                .set('Authorization', `Bearer ${user.authToken}`);
            })
            .then(function(res){
                expect(res).to.have.status(204);
                return List.findById(listing.id);
            })
            .then(function(listingResult){
                expect(listingResult).to.be.null;
            });
        });
    });

    describe('DELETE wish item endpoint', function(){
        it('should delete a wish item by id', function(){
            let wishItem;
            return List.findOne({isWishlist: true})
            .then(function(_wishItem){
                wishItem = _wishItem;
                return chai.request(app)
                .delete(`/api/lists/wishlist/${wishItem.id}`)
                .set('Authorization', `Bearer ${user.authToken}`);
            })
            .then(function(res){
                expect(res).to.have.status(204);
                return List.findById(wishItem.id);
            })
            .then(function(wishlistResult){
                expect(wishlistResult).to.be.null;
            });
        });
    });

});
