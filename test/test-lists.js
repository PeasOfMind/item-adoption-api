const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
const faker = require('faker');

const {app, runServer, closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');
const {List} = require('../lists');
const {User} = require('../users');

const expect = chai.expect;
chai.use(chaiHttp);

let user = {
    username: null,
    authToken: null,
    id: null
}

const testZip = '10101';

function seedListDatabase(userId){
    //generate a bunch of listings and wishlists associated with different users
    const num = 2;
    let seedListingData;
    return generateListingData(num, userId)
    .then(data => {
        return seedListingData = data;
    })
    .then(() => {
        const seedData = [...seedListingData, ...generateWishListData(num, userId)];
        return List.insertMany(seedData);
    });
}

function seedUserDatabase(){
    //generate 2 other users with the same zipcode and 3 other users with random zipcodes
    const seedData = [...generateOtherUsers(2, testZip), ...generateOtherUsers(1)];
    return User.insertMany(seedData);
}

function generateOtherUsers(quantity, zipcode){
    const otherUsers = [];
    //if a zipcode is not provided, generate a random one
    for (let i = 1; i<= quantity; i++){
        if(!zipcode) zipcode = faker.address.zipCode('#####');
        otherUsers.push({
            username: faker.internet.userName(),
            password: faker.internet.password(8),
            zipcode
        });
    }
    //return array of random users
    return otherUsers;
}

function generateListingData(quantity, userId){
    const listings = [];
    //find associated user zipcode to assign to listing
    return User.findById(userId)
    .then(_user => {
        return _user.zipcode;
    })
    .then(userZip => {
        for (let i=1; i<=quantity; i++){
            const dateCreated = faker.date.recent(12);
            expirationDate = new Date(dateCreated.getTime() + 14*24*60*60*1000);
            listings.push({
                user: userId,
                title: faker.random.words(),
                description: faker.lorem.sentence(),
                price: faker.random.number(),
                expirationDate,
                zipcode: userZip
            });
        }
        return listings;
    })
}

function generateWishListData(quantity, userId){
    const wishlist = [];
    for (let i=1; i<=quantity; i++){
        wishlist.push({
            user: userId,
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
            //add an associated zipcode to user document
            return User.findByIdAndUpdate(user.id, {$set: {zipcode: testZip} })
        })
        .then(() => {
            return seedListDatabase(user.id);
        })
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
                    expect(listing).to.include.keys('id', 'title', 'price', 'description', 'expiresIn', 'user', 'zipcode');
                })
                resListing = res.body.listings[0];
                return List.findById(resListing.id);
            })
            .then(function(listing){
                expect(resListing.id).to.equal(listing.id);
                expect(resListing.title).to.equal(listing.title);
                expect(resListing.description).to.equal(listing.description);
                expect(resListing.price).to.equal(listing.price);
                expect(resListing.user._id).to.equal(listing.user.toString());
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
                    expect(wishItem).to.include.keys('id', 'title', 'dateCreated', 'user')
                });
                resWishItem = res.body.wishlist[0];
                return List.findById(resWishItem.id);
            })
            .then(function(wishItem){
                expect(resWishItem.id).to.equal(wishItem.id);
                expect(resWishItem.title).to.equal(wishItem.title);
                expect(resWishItem.user._id).to.equal(wishItem.user.toString());
            });
        });
    });

    describe('GET listing by id endpoint', function(){
        it('should retrieve a single listing by id', function(){
            let targetListing;
            return List.findOne({isWishlist: false})
            .then(function(listing){
                targetListing = listing;
                return chai.request(app)
                .get(`/api/lists/listings/${targetListing.id}`)
                .set('Authorization', `Bearer ${user.authToken}`)
            })
            .then(function(res){
                expect(res).to.have.status(200);
                expect(res).to.be.json;
                expect(res.body).to.be.an('object');
                expect(res.body.id).to.equal(targetListing.id);
                expect(res.body.title).to.equal(targetListing.title);
                expect(res.body.description).to.equal(targetListing.description);
                expect(res.body.user).to.equal(targetListing.user.toString());
            });
        });
    });

    describe('GET wish item by id endpoint', function(){
        it('should retrieve a single wish item by id', function(){
            let targetItem;
            return List.findOne({isWishlist: true})
            .then(function(item){
                targetItem = item;
                return chai.request(app)
                .get(`/api/lists/wishlist/${targetItem.id}`)
                .set('Authorization', `Bearer ${user.authToken}`)
            })
            .then(function(res){
                expect(res).to.have.status(200);
                expect(res).to.be.json;
                expect(res.body).to.be.an('object');
                expect(res.body.id).to.equal(targetItem.id);
                expect(res.body.title).to.equal(targetItem.title);
                expect(res.body.user).to.equal(targetItem.user.toString());
            });
        });
    });

    describe('POST listing endpoint', function(){
        it('should add a new item listing', function(){
            //just generate one listing.
            const newListing = {
                title: 'Coffee Table',
                description: 'glass, durable, no scratches, like new',
                price: 50
            }
            return chai.request(app)
            .post('/api/lists/listings')
            .set('Authorization', `Bearer ${user.authToken}`)
            .send(newListing)
            .then(function(res){
                expect(res).to.have.status(201);
                expect(res).to.be.json;
                expect(res.body).to.be.an('object');
                expect(res.body).to.include.keys('id', 'title', 'description', 'price', 'dateCreated', 'expiresIn', 'user', 'zipcode');
                expect(res.body.id).to.be.a('string');
                expect(res.body.title).to.equal(newListing.title);
                expect(res.body.description).to.equal(newListing.description);
                expect(res.body.price).to.equal(newListing.price);
                expect(res.body.expiresIn).to.equal(14);
                expect(res.body.zipcode).to.equal(testZip);
                expect(res.body.user).to.equal(user.id);
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
                expect(res.body).to.include.keys('id', 'title', 'dateCreated', 'user');
                expect(res.body.id).to.be.a('string');
                expect(res.body.title).to.equal(newWishItem.title);
                expect(res.body.user).to.equal(user.id);
            });
        });
    });

    describe('PUT listing endpoint', function(){
        it('should edit an existing listing', function(){
            const updateData = {
                title: "Wooden Chairs, Set of 6",
                description: "Some scratches and some chairs have a slight wobble but otherwise durable",
                price: 100,
                zipcode: '11238'
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
