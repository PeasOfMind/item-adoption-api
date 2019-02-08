'use strict';

const mongoose = require('mongoose');

// TODO: add zipcode to schema
const listingSchema = mongoose.Schema({
    title: {type: String, required: true},
    description: String,
    price: {type: Number},
    expirationDate: {type: Date, default: null},
    isWishlist: {type: Boolean, default: false},
    editing: {type: Boolean, default: false},
    user: {type: String, required: true},
    zipcode: {type: Number, required: true}
});

listingSchema.methods.serialize = function(){
    const listing = {
        id: this._id,
        title: this.title,
        dateCreated: this._id.getTimestamp(),
        editing: this.editing,
        user: this.user,
        zipcode: this.zipcode
    };

    if(!this.isWishlist) {
        listing.description = this.description;
        listing.price = this.price;
        //calculate the expiration date based on difference between current date and expiration date
        listing.expiresIn = Math.round(Math.abs(new Date() - this.expirationDate.getTime())/(60*60*24*1000));
    }

    return listing
}

listingSchema.statics.createListing = function(listing){
    if (!listing.expirationDate) {
        listing.expirationDate = (new Date()).getTime() + 14*24*60*60*1000;
    }
    if (!listing.price) {
        //if no price is provided, set to free.
        listing.price = 0;
    }
    return this.create(listing);
}

listingSchema.statics.createWishItem = function(wishItem){
    wishItem.isWishlist = true;
    return this.create(wishItem);
}

const Listing = mongoose.model('Listing', listingSchema);

module.exports = {Listing}