'use strict';

const mongoose = require('mongoose');

const listingSchema = mongoose.Schema({
    title: {type: String, required: true},
    description: String,
    price: {type: Number, required: true},
    dateCreated: {type: Date, required: true},
    expirationDate: {type: Date, required: true},
    editing: {type: Boolean, default: false}
});

const wishListSchema = mongoose.Schema({
    name: {type: String, required: true},
    editing: {type: Boolean, default: false}
});

const listSchema = mongoose.Schema({
    itemListings: [listingSchema],
    wishListArray: [wishListSchema]
});

listingSchema.methods.serialize = function(){
    return{
        id: this._id,
        title: this.title,
        description: this.description,
        //calculate the expiration date based on difference between current date and expiration date
        expiresIn: Math.round(Math.abs(new Date() - this.expirationDate)/60*60*24*1000),
        editing: this.editing
    }
}

wishListSchema.methods.serialize = function(){
    return{
        id: this._id,
        name: this.name,
        editing: this.editing
    }
}

listSchema.methods.serialize = function(){
    return {
        id: this._id,
        itemListings: this.itemListings.map(listing => listing.serialize()),
        wishListArray: this.wishListArray.map(wishList => wishList.serialize())
    }
}

const List = mongoose.model('List', listSchema);
const Listing = mongoose.model('Listing', listingSchema);
const Wishlist = mongoose.model('Wishlist', wishListSchema);

module.exports = {List, Listing, Wishlist}