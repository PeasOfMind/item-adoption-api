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

router.get('/listings/:zipcode', (req, res) => {
    Listing.find({isWishlist: false})
    .then(listings => {
        return listings.filter(listing => listing.user != req.user.username);
    })
    .then(filteredListings => {
        res.json({listings: filteredListings.map(listing => listing.serialize())});
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

router.get('/wishlist', (req, res) => {
    Listing.find({user: req.user.username, isWishlist: true})
    .then(wishlist => {
        res.json({wishlist: wishlist.map(wishitem => wishitem.serialize())});
    })
    .catch(err => {
        console.error(err);
        res.status(500).json({error: 'Could not retrieve wishlist'});
    });
})

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

router.put('/listings/:id', (req, res) => {
    if(!(req.params.id && req.body.id && req.params.id === req.body.id)){
        res.status(400).json({
            error: 'Request path id and request body id must match'
        });
    }

    const updated = {

    }
});

router.delete('/:id', (req, res) => {
    Trip.findByIdAndRemove(req.params.id)
    .then(() => res.status(204).end())
    .catch(() => res.status(500).json({message: 'Could not be deleted'}));
})

module.exports = {router};