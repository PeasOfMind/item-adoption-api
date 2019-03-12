'use strict';

const express = require('express');
const router = express.Router();
const passport = require('passport');

const {List} = require('./models');
const {User} = require('../users');
const jwtAuth = passport.authenticate('jwt', {session: false});
const {SEND_API_KEY} = require('../config');

const sgMail = require('@sendgrid/mail');


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
        res.json({listings: listings.map(listing => listing.serialize())});
    });
});

router.get('/wishlist/search/:zipcode', (req, res) => {
    //need to add filtering to arrange wish items to attribute to one user
    List.find({isWishlist: true, user: {$ne: req.user.id}})
    .then(wishlist => {
        return wishlist.map(wishItem => wishItem.serialize());
    })
    .then(serializedWishlist => {
        const userWishlists = {};
        serializedWishlist.forEach(wishItem => {
            const username = wishItem.user.username;
            if (wishItem.user.zipcode === req.params.zipcode){
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

    const updated = {};

    const updatableFields = ['title', 'description', 'price', 'expirationDate', 'zipcode'];
    updatableFields.forEach(field => {
        if(req.body[field]) updated[field] = req.body[field];
    })

    List.findOneAndUpdate({_id: req.params.id, user: req.user.id}, {$set: updated})
    .then(() => res.status(204).end())
    .catch(() => res.status(500).json({message: 'Listing details could not be updated'}));
});

router.put('/wishlist/:id', (req, res) => {
    if(!(req.params.id && req.body.id && req.params.id === req.body.id)){
        res.status(400).json({
            error: 'Request path id and request body id must match'
        });
    }

    const updated = {title: req.body.title}

    List.findOneAndUpdate({_id: req.params.id, user: req.user.id}, { $set: updated})
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

router.post('/listings/contact/:itemId', (req, res) => {
    const requestingUser = {id: req.user.id};
    User.findById(requestingUser.id)
    .then(user => {
        requestingUser.email = user.email;
        requestingUser.username = user.username;
    })
    .then(() => {
        List.find({_id: req.params.itemId})
        .then(foundListing => {
            const listing = foundListing[0];
            const sellingUser = listing.user;
            const buyingWord = listing.price ? ' buying' : '';
            const priceWord = listing.price ? `at $${listing.price}` : 'for free';
            sgMail.setApiKey(process.env.SENDGRID_API_KEY);
            const msg = {
                to: sellingUser.email,
                from: requestingUser.email,
                subject: `Item Adoption: ${requestingUser.username} interest in ${listing.title}`,
                text: `Thanks for listing your item on Item Adoption! ${requestingUser.username} is interested in${buyingWord}: ${listing.title}.
                You listed this item ${priceWord} with the description "${listing.description}" at location zipcode: ${listing.zipcode}.
                Reply to this email to start a transaction with ${requestingUser.username}.`,
                html: `<p>Thanks for listing your item on Item Adoption! ${requestingUser.username} is interested in${buyingWord}: ${listing.title}.</p>
                <p>You listed this item ${priceWord} with the description "${listing.description}" at location zipcode: ${listing.zipcode}.
                Reply to this email to start a transaction with ${requestingUser.username}.</p>`,
            };
            sgMail.send(msg);
        })
        .then(() => res.status(204).end())
    });

});

router.post('/wishlist/contact/:itemId', (req, res) => {
    console.log('contacting...')
    const requestingUser = {id: req.user.id};
    console.log('the requesting user with just the id is:', requestingUser);
    User.findById(requestingUser.id)
    .then(user => {
        requestingUser.email = user.email;
        requestingUser.username = user.username;
        console.log('requesting user is:', requestingUser);
    })
    .then(() => {
        List.find({_id: req.params.itemId})
        .then(foundWishItem => {
            const wishItem = foundWishItem[0];
            const itemUser = wishItem.user;
            sgMail.setApiKey(process.env.SENDGRID_API_KEY);
            const msg = {
                to: itemUser.email,
                from: requestingUser.email,
                subject: `Item Adoption: ${requestingUser.username} wants to offer you ${wishItem.title}`,
                text: `Thanks for listing your wishlist on Item Adoption! ${requestingUser.username} is interested in offering you: ${wishItem.title}.
                Reply to this email to start a transaction with ${requestingUser.username}.`,
                html: `<p>Thanks for listing your wishlist on Item Adoption! ${requestingUser.username} is interested in offering you: ${wishItem.title}.</p>
                Reply to this email to start a transaction with ${requestingUser.username}.</p>`,
            };
            sgMail.send(msg);
        })
        .then(() => res.status(204).end())
    });

});

module.exports = {router};