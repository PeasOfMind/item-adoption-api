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
        return User.remove({});
    });

    describe('/api/users', function(){
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


        });
    });


});