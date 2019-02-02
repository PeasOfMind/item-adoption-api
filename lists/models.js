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

const wishItemSchema = mongoose.Schema({
    name: {type: String, required: true},
    editing: {type: Boolean, default: false}
});

const listSchema = mongoose.Schema({
    itemListings: [listingSchema],
    wishList: [wishItemSchema]
});

listingSchema.methods.serialize = function(){
    return {
        id: this._id,
        title: this.title,
        description: this.description,
        //calculate the expiration date based on difference between current date and expiration date
        expiresIn: Math.round(Math.abs(new Date() - this.expirationDate.getTime())/(60*60*24*1000)),
        editing: this.editing
    }
}

wishItemSchema.methods.serialize = function(){
    return {
        id: this._id,
        name: this.name,
        editing: this.editing
    }
}

listSchema.methods.serialize = function(){
    return {
        id: this._id,
        itemListings: this.itemListings.map(listing => listing.serialize()),
        wishList: this.wishList.map(wishList => wishList.serialize())
    }
}

const List = mongoose.model('List', listSchema);
const Listing = mongoose.model('Listing', listingSchema);
const WishItem = mongoose.model('WishItem', wishItemSchema);

module.exports = {List, Listing, WishItem}