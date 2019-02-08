'use strict';

const express = require('express');
const router = express.Router();
const passport = require('passport');

const {Listing} = require('./models');
const jwtAuth = passport.authenticate('jwt', {session: false});

router.use(jwtAuth);

router.get('/listings', (req, res) => {
    Listing.find({user: req.user.username, isWishlist: false})
    .then(listings => {
        res.json({listings: listings.map(listing => listing.serialize())});
    })
    .catch(err => {
        console.error(err);
        res.status(500).json({error: 'Could not retrieve active listings'});
    });
})

router.post('/listings', (req,res) => {
    const requiredFields = ['user','title', 'price'];
    const missingField = requiredFields.find(field => !(field in req.body));
    if (missingField){
        const message = `Missing '${missingField}' in request body`;
        console.error(message);
        return res.status(400).send(message);
    }

    const newListing = {
        user: req.user.username,
        title: req.body.title,
        price: req.body.price,
    };

    newListing.description = req.body.description || 'No Description Available';

    Listing.createListing(newListing)
    .then(listing => res.status(201).json(listing.serialize()))
    .catch(err => {
        console.error(err);
        res.status(500).json({error: 'Listing could not be saved.'});
    });
});

router.post('/wishlist', (req, res) => {
    const requiredFields = ['user','title'];
    const missingField = requiredFields.find(field => !(field in req.body));
    if (missingField){
        const message = `Missing '${missingField}' in request body`;
        console.error(message);
        return res.status(400).send(message);
    }

    const newWishItem = {
        title: req.body.title,
        user: req.user.username,
        isWishlist: true
    }

    Listing.createWishItem(newWishItem)
    .then(wishItem => res.status(201).json(wishItem.serialize()))
    .catch(err => {
        console.error(err);
        res.status(500).json({error: 'Wishlist item could not be saved.'});
    });
});

module.exports = {router};