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
        listings.push({
            title: faker.random.words(),
            description: faker.lorem.sentence(),
            price: faker.random.number()
        })
    }
    return listings;
}

function tearDownDb(){
    console.warn('Deleting database');
    return mongoose.connection.dropDatabase();
}

describe('/api/lists', function(){

    before(function(){
        return runServer(TEST_DATABASE_URL);
    });

    afterEach(function (){
        return tearDownDb();
    })

    after(function(){
        return closeServer();
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
            })
        })
    })

});