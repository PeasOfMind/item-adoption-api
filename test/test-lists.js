const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
const faker = require('faker');

const {app, runServer, closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');
const {Listing} = require('../lists');

const expect = chai.expect;
chai.use(chaiHttp);

let user = {
    username: null,
    authToken: null
}

function seedDatabase(){
    console.info('seeding listing data');
    const seedData = [...generateListingData(10), ...generateWishListData(10)];
    return Listing.insertMany(seedData);
}

function generateListingData(num){
    const listings = [];
    for (let i=0; i<num; i++){
        const dateCreated = faker.date.recent(12);
        expirationDate = new Date(dateCreated.getTime() + 14*24*60*60*1000);
        listings.push({
            user: user.username,
            title: faker.random.words(),
            description: faker.lorem.sentence(),
            price: faker.random.number(),
            expirationDate,
        });
    }
    return listings;
}

function generateWishListData(num){
    const wishlist = [];
    for (let i=0; i<num; i++){
        wishlist.push({
            user: user.username,
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
        it('should retrieve all active item listings', function(){
            let res;
            return chai.request(app)
            .get('/api/lists/listings')
            .set('Authorization', `Bearer ${user.authToken}`)
            .then(function(_res){
                res = _res;
                expect(res).to.have.status(200);
                expect(res.body.listings).to.have.lengthOf.at.least(1);
                return Listing.count({isWishlist: false});
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
                    expect(listing).to.include.keys('id', 'title', 'description', 'expiresIn', 'editing', 'user');
                })
                resListing = res.body.listings[0];
                return Listing.findById(resListing.id);
            })
            .then(function(listing){
                expect(resListing.id).to.equal(listing.id);
                expect(resListing.title).to.equal(listing.title);
                expect(resListing.editing).to.equal(listing.editing);
                expect(resListing.description).to.equal(listing.description);
                expect(resListing.user).to.equal(listing.user);
            });
        }); 
    });

    describe('GET wish item endpoint', function(){
        it('should retrieve all wish list items', function(){
            let res;
            return chai.request(app)
            .get('/api/lists/wishlist')
            .set('Authorization', `Bearer ${user.authToken}`)
            .then(function(_res){
                res = _res;
                expect(res).to.have.status(200);
                expect(res.body.wishlist).to.have.lengthOf.at.least(1);
                return Listing.count({isWishlist: true});
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
                    expect(wishItem).to.include.keys('id', 'title', 'editing', 'dateCreated', 'user')
                });
                resWishItem = res.body.wishlist[0];
                return Listing.findById(resWishItem.id);
            })
            .then(function(wishItem){
                expect(resWishItem.id).to.equal(wishItem.id);
                expect(resWishItem.title).to.equal(wishItem.title);
                expect(resWishItem.user).to.equal(wishItem.user);
                expect(resWishItem.editing).to.equal(wishItem.editing);
            });
        });
    });

    describe('POST listing endpoint', function(){
        it('should add a new item listing', function(){
            //just generate one listing.
            const newListing = {
                user: user.username,
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
                expect(res.body).to.include.keys('id', 'title', 'description', 'dateCreated', 'expiresIn', 'editing', 'user');
                expect(res.body.id).to.be.a('string');
                expect(res.body.title).to.equal(newListing.title);
                expect(res.body.description).to.equal(newListing.description);
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
                expect(res.body).to.include.keys('id', 'title', 'dateCreated','editing', 'user');
                expect(res.body.id).to.be.a('string');
                expect(res.body.title).to.equal(newWishItem.title);
                expect(res.body.editing).to.be.false;
                expect(res.body.user).to.equal(user.username);
            });
        });

    });

});