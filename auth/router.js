'use strict';

const express = require('express');
const passport = require('passport');
const jwt = require('jsonwebtoken');

const config = require('../config');
const router = express.Router();

//uses HS256 algorithm by default 
const createAuthToken = function(user){
    return jwt.sign({user}, config.JWT_SECRET, {
        subject: user.username,
        expiresIn: config.JWT_EXPIRY
    });
};

const localAuth = passport.authenticate('local', {session: false});

router.post('/login', localAuth, (req, res) => {
    const authToken = createAuthToken(req.user.serialize());
    res.json({authToken, username: req.user.username, id: req.user.id})
})

const jwtAuth = passport.authenticate('jwt', {session: false});

router.post('/refresh', jwtAuth, (req, res) => {
    const authToken = createAuthToken(req.user);
    res.json({authToken, username: req.user.username, id: req.user.id});
});

module.exports = {router, createAuthToken};