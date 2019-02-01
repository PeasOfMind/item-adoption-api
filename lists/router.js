'use strict';

const express = require('express');
const router = express.Router();

const {List, Listing, Wishlist} = require('./models');

router.post('/listings', (req,res) => {
    const requiredFields = ['title', 'price'];
    requiredFields.forEach(field => {
        if (!(field in req.body)){
            const message = `Missing '${field} in request body`;
            console.error(message);
            return res.status(400).send(message);
        }
    });

    const newListing = {
        title: req.body.title,
        price: req.body.price,
        dateCreated: new Date()
    };

    newListing.description = req.body.description || 'No Description Available';
    //add 14 days (converted into milliseconds) to dateCreated to make expiration date
    newListing.expirationDate = new Date(newListing.dateCreated.getTime() + 14*24*60*60*1000);

    Listing.create(newListing)
    .then(listing => res.status(201).json(listing.serialize()))
    .catch(err => {
        console.error(err);
        res.status(500).json({error: 'Listing could not be saved.'});
    });
});

module.exports = {router};