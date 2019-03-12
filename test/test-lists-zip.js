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
            email: faker.internet.email(),
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

describe('Seach by zipcode', function(){
    const username = 'testUser';
    const password = 'testPass123';

    before(function(){
        runServer(TEST_DATABASE_URL);
        const otherUsersIds = [];
        //create the user and save the authToken to validate each request
        return chai.request(app)
        .post('/api/users')
        .send({username, password})
        .then(response => {
            user.username = response.body.username;
            user.authToken = response.body.authToken;
            user.id = response.body.id;
            //add an associated zipcode to user document
            return User.findByIdAndUpdate(user.id, {$set: {zipcode: testZip, email: faker.internet.email()} })
        })
        .then(() => {
            return seedUserDatabase();
        })
        .then(() => {
            //find all users
            return User.find();
        })
        .then(users => {
            //save the user ids to an array;
            return users.forEach(user => {
                otherUsersIds.push(user._id);
            });
        })
        .then(() => {
            //add listings and wishlists for each of the other users
            return otherUsersIds.map(userId => {
                return seedListDatabase(userId);
            });
        })
        .then(promises => Promise.all(promises));
    });
    
    after(function(){
        tearDownDb();
        return closeServer();
    });

    describe('GET all listings in area endpoint', function(){
        it('should retrieve active item listings in user area not including user entries', function(){
            let res;
            return chai.request(app)
            .get(`/api/lists/listings/search/${testZip}`)
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
            .get(`/api/lists/listings/search/${testZip}`)
            .set('Authorization', `Bearer ${user.authToken}`)
            .then(function(res){
                expect(res).to.have.status(200);
                expect(res).to.be.json;
                expect(res.body.listings).to.be.an('array');
                res.body.listings.forEach(listing => {
                    expect(listing).to.be.an('object');
                    expect(listing).to.include.keys('id', 'title', 'price','description', 'expiresIn', 'user', 'zipcode');
                })
                resListing = res.body.listings[0];
                return List.findById(resListing.id);
            })
            .then(function(listing){
                expect(resListing.id).to.equal(listing.id);
                expect(resListing.title).to.equal(listing.title);
                expect(resListing.price).to.equal(listing.price);
                expect(resListing.description).to.equal(listing.description);
                expect(resListing.user._id).to.equal(listing.user.toString());
            });
        }); 
    })

    describe('GET all wishlists in area endpoint', function(){
        it('should retrieve all wishlists in user area not including user entries', function(){
            let res;
            return chai.request(app)
            .get(`/api/lists/wishlist/search/${testZip}`)
            .set('Authorization', `Bearer ${user.authToken}`)
            .then(function(_res){
                res = _res;
                expect(res).to.have.status(200);
                expect(res).to.be.json;
                expect(res.body).to.be.an('object');
                return List.count({isWishlist: true, zipcode: testZip, user: {$ne: user.id}});
            });
        });

        it('should return wish items with the right fields', function(){
            return chai.request(app)
            .get(`/api/lists/wishlist/search/${testZip}`)
            .set('Authorization', `Bearer ${user.authToken}`)
            .then(function(res){
                expect(res).to.have.status(200);
                Object.keys(res.body).forEach(user => {
                    expect(res.body[user]).to.be.an('object');
                    expect(res.body[user]).to.include.keys('zipcode', 'userId', 'wishlist');
                    res.body[user].wishlist.forEach(wishItem => {
                        expect(wishItem).to.include.keys('id', 'title');
                    });
                });
            });
        });
    });


    describe('POST listing contact email endpoint', function(){
        it('should send email to listing owner successfully', function(){
            List.find({isWishlist: false, zipcode: testZip, user: {$ne: user.id}})
            .then(listings => {
                //retrieve listing id of first result
                return listings[0]._id;
            })
            .then(listingId => {
                console.log('the listing id is',listingId);
                return chai.request(app)
                .post(`/api/lists/listings/contact/${listingId}`)
                .set('Authorization', `Bearer ${user.authToken}`)
            })
            .then(function(res){
                expect(res).to.have.status(204);
            });
        });
    });

    describe('POST wishlist contact email endpoint', function(){
        it('should send email to wishlist owner successfully', function(){
            List.find({isWishlist: true, user: {$ne: user.id}})
            .then(wishlist => {
                //retrieve wishlist id of first result
                return wishlist[0]._id;
            })
            .then(itemId => {
                return chai.request(app)
                .post(`/api/lists/wishlist/contact/${itemId}`)
                .set('Authorization', `Bearer ${user.authToken}`)
            })
            .then(function(res){
                expect(res).to.have.status(204);
            });
        });
    });

});
