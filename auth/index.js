'use strict';

const {router, createAuthToken} = require('./router');
const {localStrategy, jwtStrategy} = require('./strategies');

module.exports = {router, createAuthToken, localStrategy, jwtStrategy};