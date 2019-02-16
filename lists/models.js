'use strict';

const mongoose = require('mongoose');

// TODO: add zipcode to schema
const listSchema = mongoose.Schema({
    title: {type: String, required: true},
    description: String,
    price: {type: Number},
    expirationDate: {type: Date, default: null},
    isWishlist: {type: Boolean, default: false},
    editing: {type: Boolean, default: false},
    user: {type: mongoose.Schema.Types.ObjectId, ref:'User'},
    zipcode: {type: Number, required: true}
});

listSchema.methods.serialize = function(){
    const list = {
        id: this._id,
        title: this.title,
        dateCreated: this._id.getTimestamp(),
        editing: this.editing,
        user: this.user,
        zipcode: this.zipcode
    };

    if(!this.isWishlist) {
        list.description = this.description;
        list.price = this.price;
        //calculate the expiration date based on difference between current date and expiration date
        list.expiresIn = Math.round(Math.abs(new Date() - this.expirationDate.getTime())/(60*60*24*1000));
    }

    return list;
}

listSchema.statics.createListing = function(listing){
    if (!listing.expirationDate) {
        listing.expirationDate = (new Date()).getTime() + 14*24*60*60*1000;
    }
    if (!listing.price) {
        //if no price is provided, set to free.
        listing.price = 0;
    }
    return this.create(listing);
}

listSchema.statics.createWishItem = function(wishItem){
    wishItem.isWishlist = true;
    return this.create(wishItem);
}

listSchema.pre('find', function(next){
    this.populate('user', ['username', 'zipcode'])
});

const List = mongoose.model('List', listSchema);

module.exports = {List}