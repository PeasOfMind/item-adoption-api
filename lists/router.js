'use strict';

const express = require('express');
const router = express.Router();
const passport = require('passport');

const {List} = require('./models');
const jwtAuth = passport.authenticate('jwt', {session: false});

router.use(jwtAuth);

router.get('/listings', (req, res) => {
    List.find({user: req.user.id, isWishlist: false})
    .then(listings => {
        res.json({listings: listings.map(listing => listing.serialize())});
    })
    .catch(err => {
        console.error(err);
        res.status(500).json({error: 'Could not retrieve active listings'});
    });
});

router.get('/wishlist', (req, res) => {
    List.find({user: req.user.id, isWishlist: true})
    .then(wishlist => {
        res.json({wishlist: wishlist.map(wishitem => wishitem.serialize())});
    })
    .catch(err => {
        console.error(err);
        res.status(500).json({error: 'Could not retrieve wishlist'});
    });
});

router.get('/listings/:listingId', (req, res) => {
    List.findById(req.params.listingId)
    .then(listing => {
        res.json(listing.serialize());
    })
    .catch(err => {
        console.error(err);
        res.status(500).json({error: 'Could not retrieve the listing'})
    })
})

router.get('/wishlist/:itemId', (req, res) => {
    List.findById(req.params.itemId)
    .then(item => {
        res.json(item.serialize());
    })
    .catch(err => {
        console.error(err);
        res.status(500).json({error: 'Could not retrieve the wish item'})
    })
})

router.get('/listings/search/:zipcode', (req, res) => {
    List.find({isWishlist: false, zipcode: req.params.zipcode, user: {$ne: req.user.id}})
    .then(listings => {
        console.log(listings);
        res.json({listings: listings.map(listing => listing.serialize())});
    });
});

router.get('/wishlist/search/:zipcode', (req, res) => {
    //need to add filtering to arrange wish items to attribute to one user
    List.find({isWishlist: true, user: {$ne: req.user.id}})
    .then(wishlist => {
        return {wishlist: wishlist.map(wishItem => wishItem.serialize())};
    })
    .then(serializedWishlist => {
        const userWishlists = {};
        console.log(serializedWishlist);
        serializedWishlist.wishlist.forEach(wishItem => {
            const username = wishItem.user.username;
            if (wishlistItem.user.zipcode !== req.params.zipcode){
                if (!(username in userWishlists)) {
                    userWishlists[username] = {
                        zipcode: wishItem.user.zipcode,
                        userId: wishItem.user._id,
                        wishlist: []
                    }
                }
                userWishlists[username].wishlist.push({
                    id: wishItem.id,
                    title: wishItem.title
                });
            }
        })
        res.json(userWishlists);
    })
    .catch(err => {
        console.error(err);
        res.status(500).json({error: 'Could not retrieve other wishlists'});
    })
})

router.post('/listings', (req,res) => {
    const requiredFields = ['title', 'price'];
    const missingField = requiredFields.find(field => !(field in req.body));
    if (missingField){
        const message = `Missing '${missingField}' in request body`;
        console.error(message);
        return res.status(400).send(message);
    }

    const newListing = {
        user: req.user.id,
        title: req.body.title
    };

    newListing.description = req.body.description || 'No Description Available';
    //if no price is provided, set to free.
    newListing.price = req.body.price || 0;
    //set a zipcode if the user wants to specify it
    if (req.body.zipcode) newListing.zipcode = req.body.zipcode;
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
        user: req.user.id,
        isWishlist: true,
    }

    List.createWishItem(newWishItem)
    .then(wishItem => {
        res.status(201).json(wishItem.serialize())
    })
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