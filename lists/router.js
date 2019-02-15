'use strict';

const express = require('express');
const router = express.Router();
const passport = require('passport');

const {List} = require('./models');
const jwtAuth = passport.authenticate('jwt', {session: false});

router.use(jwtAuth);

router.get('/listings', (req, res) => {
    List.find({user: req.user.username, isWishlist: false})
    .then(listings => {
        res.json({listings: listings.map(listing => listing.serialize())});
    })
    .catch(err => {
        console.error(err);
        res.status(500).json({error: 'Could not retrieve active listings'});
    });
});

router.get('/wishlist', (req, res) => {
    List.find({user: req.user.username, isWishlist: true})
    .then(wishlist => {
        res.json({wishlist: wishlist.map(wishitem => wishitem.serialize())});
    })
    .catch(err => {
        console.error(err);
        res.status(500).json({error: 'Could not retrieve wishlist'});
    });
});

router.get('/listings/:zipcode', (req, res) => {
    console.log('the search zipcode is:', req.params.zipcode);
    List.find({isWishlist: false, zipcode: req.params.zipcode})
    .then(listings => {
        return listings.filter(listing => listing.user != req.user.username);
    })
    .then(filteredListings => {
        res.json({listings: filteredListings.map(listing => listing.serialize())});
    });
});

router.get('/wishlist/:zipcode', (req, res) => {
    List.find({isWishlist: true, zipcode: req.params.zipcode})
    .then(wishlist => {
        return wishlist.filter(wishItem => wishItem.user != req.user.username);
    })
    .then(filteredWishlist => {
        res.json({wishlist: filteredWishlist.map(wishItem => wishItem.serialize())});
    });
})

router.post('/listings', (req,res) => {
    const requiredFields = ['title', 'price', 'zipcode'];
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
        zipcode: req.body.zipcode
    };

    newListing.description = req.body.description || 'No Description Available';

    List.createListing(newListing)
    .then(listing => res.status(201).json(listing.serialize()))
    .catch(err => {
        console.error(err);
        res.status(500).json({error: 'Listing could not be saved.'});
    });
});

router.post('/wishlist', (req, res) => {
    const requiredFields = ['title'];
    const missingField = requiredFields.find(field => !(field in req.body));
    if (missingField){
        const message = `Missing '${missingField}' in request body`;
        console.error(message);
        return res.status(400).send(message);
    }

    const newWishItem = {
        title: req.body.title,
        user: req.user.username,
        isWishlist: true,
        zipcode: req.body.zipcode
    }

    List.createWishItem(newWishItem)
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

    const updated = {editing: false}

    const updatableFields = ['title', 'description', 'price', 'expirationDate', 'zipcode'];
    updatableFields.forEach(field => {
        if(req.body[field]) updated[field] = req.body[field];
    })

    List.findByIdAndUpdate(req.params.id, { $set: updated})
    .then(() => res.status(204).end())
    .catch(() => res.status(500).json({message: 'Listing details could not be updated'}));
});

router.put('/wishlist/:id', (req, res) => {
    if(!(req.params.id && req.body.id && req.params.id === req.body.id)){
        res.status(400).json({
            error: 'Request path id and request body id must match'
        });
    }

    const updated = {
        title: req.body.title,
        editing: false
    }

    List.findByIdAndUpdate(req.params.id, { $set: updated})
    .then(() => res.status(204).end())
    .catch(() => res.status(500).json({message: 'Wishlist details could not be updated'}));
});

router.delete('/listings/:id', (req, res) => {
    List.findByIdAndRemove(req.params.id)
    .then(() => res.status(204).end())
    .catch(() => res.status(500).json({message: 'Could not delete listing'}));
});

router.delete('/wishlist/:id', (req, res) => {
    List.findByIdAndRemove(req.params.id)
    .then(() => res.status(204).end())
    .catch(() => res.status(500).json({message: 'Could not delete wishlist'}));
});

module.exports = {router};