'use strict';

const express = require('express');
const {User} = require('./models');
const {createAuthToken} = require('../auth');
const router = express.Router();

const passport = require('passport');
const jwtAuth = passport.authenticate('jwt', {session: false});

router.post('/', (req, res) => {
    const requiredFields = ['username', 'password'];
    const missingField = requiredFields.find(field => !(field in req.body));
    if (missingField){
        return res.status(422).json({
            code: 422,
            reason: 'ValidationError',
            message: 'Missing field',
            location: missingField
        });
    }

    const nonStringField = requiredFields.find(
        field => field in req.body && typeof req.body[field] !== 'string');

    if (nonStringField){
        return res.status(422).json({
            code: 422,
            reason: 'ValidationError',
            message: 'Incorrect field type: expected string',
            location: nonStringField
        });
    }
    
    //TODO: add nonTrimmedField and sizedFields validation

    let {username, password} = req.body;

    return User.find({username}, null)
    .then(entry => {
        if(entry.length > 0){
            return Promise.reject({
                code: 422,
                reason: 'ValidationError',
                message: 'Username already taken',
                location: 'username'
            });
        }
        return User.hashPassword(password);
    })
    .then(hash => User.create({username, password: hash}))
    .then(user => {
        const serializedUser = user.serialize();
        serializedUser.authToken = createAuthToken(serializedUser);
        return res.status(201).json(serializedUser);
    })
    .catch(err => {
        if (err.reason === 'ValidationError'){
            return res.status(err.code).json(err);
        }
        res.status(500).json({code: 500, message: 'Internal server error'});
    });

});

router.get('/:id', jwtAuth, (req, res) => {
    //This endpoint gets the zipcode for the user only.
    User.findById(req.params.id)
    .then(user => {
        return res.json({zipcode: user.zipcode});
    });

});

router.put('/:id', jwtAuth, (req, res) => {
    //This endpoint assigns/updates a zipcode for the user only.
    console.log('req.params.id exists:', !!req.params.id)
    console.log('req.body.id exists:', !!req.body.id)
    console.log('params id equas body id:', req.params.id === req.body.id)
    console.log('zipcode:', req.body.zipcode)
    if(!(req.params.id && req.body.id && req.params.id === req.body.id)){
        res.status(400).json({
            error: 'Request path id and request body id must match'
        });
    }

    const updated = {zipcode: req.body.zipcode}

    User.findByIdAndUpdate(req.params.id, {$set: updated})
    .then(() => res.status(204).end())
    .catch(() => res.status(500).json({message: 'Zipcode data could not be saved to user'}))
});

module.exports = {router};