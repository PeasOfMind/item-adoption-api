'use strict';

const chai = require('chai');
const chaiHttp = require('chai-http');

const {app, runServer, closeServer} = require('../server');
const {User} = require('../users');
const {TEST_DATABASE_URL} = require('../config');

const expect = chai.expect;

describe('/api/user', function(){
    const username = 'testUser1';
    const password = 'testPass1';

    before(function(){
        return runServer(TEST_DATABASE_URL);
    });

    after(function(){
        return closeServer();
    });

    afterEach(function(){
        return User.deleteMany({});
    });

    describe('Register user endpoint', function(){
        describe('POST', function(){
            it('Should reject users with missing username', function(){
                return chai.request(app)
                .post('/api/users')
                .send({password})
                .then(res => {
                    expect(res).to.have.status(422);
                    expect(res.body.reason).to.equal('ValidationError');
                    expect(res.body.message).to.equal('Missing field');
                    expect(res.body.location).to.equal('username');
                })
                .catch(err => {
                    throw err;
                });
            });

            it('Should reject users with missing password', function(){
                return chai.request(app)
                .post('/api/users')
                .send({username})
                .then(res => {
                    expect(res).to.have.status(422);
                    expect(res.body.reason).to.equal('ValidationError');
                    expect(res.body.message).to.equal('Missing field');
                    expect(res.body.location).to.equal('password');
                });
            });

            it('Should reject users with non-string username', function(){
                return chai.request(app)
                .post('/api/users')
                .send({username: 1234, password})
                .then(res => {
                    expect(res).to.have.status(422);
                    expect(res.body.reason).to.equal('ValidationError');
                    expect(res.body.message).to.equal('Incorrect field type: expected string');
                    expect(res.body.location).to.equal('username');
                })
                .catch(err => {
                    throw err;
                });
            });
            
            it('Should reject users with non-string password', function(){
                return chai.request(app)
                .post('/api/users')
                .send({username, password: 1234})
                .then(res => {
                    expect(res).to.have.status(422);
                    expect(res.body.reason).to.equal('ValidationError');
                    expect(res.body.message).to.equal('Incorrect field type: expected string');
                    expect(res.body.location).to.equal('password');
                })
                .catch(err => {
                    throw err;
                });
            });

            it('Should create a new user', function(){
                return chai.request(app)
                .post('/api/users')
                .send({username, password})
                .then(res => {
                    expect(res).to.have.status(201);
                    expect(res.body).to.be.an('object');
                    expect(res.body).to.have.keys('username', 'id', 'authToken');
                    expect(res.body.username).to.equal(username);
                    return User.findOne({username});
                })
                .then(user => {
                    expect(user).to.not.be.null;
                    return user.validatePassword(password);
                })
                .then(passwordIsCorrect => {
                    expect(passwordIsCorrect).to.be.true;
                })
                .catch(err => {
                    throw err;
                });
            });


        });
    });

    //handle user location (zipcode) endpoints
    describe('/:id', function(){
        describe('GET', function(){
            it('Should provide the zipcode for the given user ID', function(){
                const testZip = '10101';
                let user;
                //register a user first
                return chai.request(app)
                .post('/api/users')
                .send({username, password})
                .then(res => {
                    return res.body;
                })
                .then(_user => {
                    // store user info to use
                    user = _user;
                    //add the zipcode to the user document directly
                    return User.findByIdAndUpdate(user.id, {$set: {zipcode: testZip} })
                })
                .then(() => {
                    return chai.request(app)
                    .get(`/api/users/${user.id}`)
                    .set('Authorization', `Bearer ${user.authToken}`)
                })
                .then(res => {
                    expect(res).to.have.status(200);
                    expect(res).to.be.json;
                    expect(res.body.zipcode).to.equal(testZip);
                })

            })
        })


        describe('PUT', function(){
            it('Should update the zipcode for the given user ID', function(){
                const testZip = '00001';
                //register a user first
                return chai.request(app)
                .post('/api/users')
                .send({username, password})
                .then(res => {
                    return res.body;
                })
                .then(user => {
                    //then add a zipcode to user
                    return chai.request(app)
                    .put(`/api/users/${user.id}`)
                    .set('Authorization', `Bearer ${user.authToken}`)
                    .send({zipcode: testZip, id: user.id})
                })
                .then(res => {
                    expect(res).to.have.status(204);
                    return User.findOne({username});
                })
                .then(user => {
                    expect(user.zipcode).to.be.a('string');
                    expect(user.zipcode).to.equal(testZip);
                });
            });
        });

    })




});