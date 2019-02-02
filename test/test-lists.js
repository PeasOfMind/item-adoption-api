const chai = require('chai');
const chaiHttp = require('chai-http');
const mongoose = require('mongoose');
const faker = require('faker');

const {app, runServer, closeServer} = require('../server');
const {TEST_DATABASE_URL} = require('../config');
const {Listing} = require('../lists');

const expect = chai.expect;
chai.use(chaiHttp);

function seedListingData(){
    console.info('seeding listing data');
    const seedData = generateListingData(10);
    return Listing.insertMany(seedData);
}

function generateListingData(num){
    const listings = [];
    for (let i=0; i<num; i++){
        const dateCreated = faker.date.recent(12);
        expirationDate = new Date(dateCreated.getTime() + 14*24*60*60*1000);
        listings.push({
            title: faker.random.words(),
            description: faker.lorem.sentence(),
            price: faker.random.number(),
            dateCreated,
            expirationDate
        });
    }
    return listings;
}

function generateWishListData(num){
    const wishlist = [];
    for (let i=0; i<num; i++){
        wishlist.push({
            name: faker.random.words()
        });
    }
    return wishlist
}

function tearDownDb(){
    console.warn('Deleting database');
    return mongoose.connection.dropDatabase();
}

describe('/api/lists', function(){

    before(function(){
        return runServer(TEST_DATABASE_URL);
    });

    beforeEach(function(){
        return seedListingData();
    })

    afterEach(function (){
        return tearDownDb();
    })

    after(function(){
        return closeServer();
    });

    describe('GET endpoint', function(){
        it('should retrieve all active item listings', function(){
            let res;
            return chai.request(app)
            .get('/api/lists/listings')
            .then(function(_res){
                res = _res;
                expect(res).to.have.status(200);
                expect(res.body.listings).to.have.lengthOf.at.least(1);
                return Listing.count();
            })
            .then(function(count){
                expect(res.body.listings).to.have.lengthOf(count);
            });
        });

        it('should return active listings with the right fields', function(){
            let resListing;
            return chai.request(app)
            .get('/api/lists/listings')
            .then(function(res){
                expect(res).to.have.status(200);
                expect(res).to.be.json;
                expect(res.body.listings).to.be.an('array');
                res.body.listings.forEach(trip => {
                    expect(trip).to.be.an('object');
                    expect(trip).to.include.keys('id', 'title', 'description', 'expiresIn', 'editing');
                })
                resListing = res.body.listings[0];
                return Listing.findById(resListing.id);
            })
            .then(function(listing){
                expect(resListing.id).to.equal(listing.id);
                expect(resListing.title).to.equal(listing.title);
                expect(resListing.editing).to.equal(listing.editing);
            });
        }); 
    });

    describe('POST endpoint', function(){
        it('should add a new item listing', function(){
            //just generate one listing. Should be the first one in the listings array.
            const newListing = generateListingData(1)[0];
            return chai.request(app)
            .post('/api/lists/listings')
            .send(newListing)
            .then(function(res){
                expect(res).to.have.status(201);
                expect(res).to.be.json;
                expect(res.body).to.be.an('object');
                expect(res.body).to.include.keys('id', 'title', 'description', 'expiresIn', 'editing');
                expect(res.body.id).to.be.a('string');
                expect(res.body.title).to.equal(newListing.title);
                expect(res.body.description).to.equal(newListing.description);
                expect(res.body.expiresIn).to.equal(14);
                expect(res.body.editing).to.be.false;
            });
        });

        it('should add a new wishlist item', function(){
            //just generate one wishlist item. Should be the first one in the wishlist array.
            const newWishItem = generateWishListData(1)[0];
            return chai.request(app)
            .post('/api/lists/wishlist')
            .send(newWishItem)
            .then(function(res){
                expect(res).to.have.status(201);
                expect(res).to.be.json;
                expect(res.body).to.be.an('object');
                expect(res.body).to.include.keys('id', 'name', 'editing');
                expect(res.body.id).to.be.a('string');
                expect(res.body.name).to.equal(newWishItem.name);
                expect(res.body.editing).to.be.false;
            });
        });

    });

});