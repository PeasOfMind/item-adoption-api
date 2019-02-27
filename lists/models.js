'use strict';

const mongoose = require('mongoose');
const {User} = require('../users/models');

const listSchema = mongoose.Schema({
    title: {type: String, required: true},
    description: String,
    price: {type: Number},
    expirationDate: {type: Date},
    isWishlist: {type: Boolean, default: false},
    user: {type: mongoose.Schema.Types.ObjectId, ref:'User'},
    zipcode: {type: String}
});

listSchema.methods.serialize = function(){
    const list = {
        id: this._id,
        title: this.title,
        dateCreated: this._id.getTimestamp(),
        user: this.user
    };
    
    if(!this.isWishlist) {
        list.description = this.description;
        list.price = this.price;
        list.zipcode = this.zipcode;
        //calculate the expiration date based on difference between current date and expiration date
        list.expiresIn = Math.round(Math.abs(new Date() - this.expirationDate.getTime())/(60*60*24*1000));
    }

    return list;
}

listSchema.statics.createListing = function(listing){
    if (!listing.expirationDate) {
        listing.expirationDate = (new Date()).getTime() + 14*24*60*60*1000;
    }
    //if zipcode is not provided, set zipcode to one associated with the user.
    if (!listing.zipcode) {
        return User.findById(listing.user)
        .then(user => {
            listing.zipcode = user.zipcode;
            return this.create(listing);
        })
        .catch(err => {
            console.error(err);
        })
    } else {
        return this.create(listing);
    }
}

listSchema.statics.createWishItem = function(wishItem){
    //zipcodes won't be associated with each wishItem,
    //only the full wishlist
    wishItem.isWishlist = true;
    return this.create(wishItem);
}

listSchema.pre('find', function(next){
    this.populate('user', ['id', 'username', 'zipcode']);
    next();
});

const List = mongoose.model('List', listSchema);

module.exports = {List}