'use strict'

const mongoose = require('mongoose');

const listingSchema = mongoose.Schema({
    title: {type: String, required: true},
    description: String,
    price: {type: Number, required: true},
    expiresIn: {type: Number, required: true, default: 14},
    editing: {type: Boolean, required: true}
});

const wishListSchema = mongoose.Schema({
    name: {type: String, required: true},
    editing: {type: Boolean, required: true}
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
        expiresIn: this.expiresIn,
        editing: this.editing
    }
}

wishListSchema.methods.serialize = function(){
    return{
        id: this._id,
        name: this.title,
        editing: this.editing
    }
}

listingSchema.methods.serialize = function(){
    return {
        id: this._id,
        itemListings: this.itemListings.map(listing => listing.serialize()),
        wishListArray: this.wishListArray.map(wishList => wishList.serialize())
    }
}

const List = mongoose.model('List', listSchema);

module.exports = {List}