'use strict';

const mongoose = require('mongoose');

const listingSchema = mongoose.Schema({
    title: {type: String, required: true},
    description: String,
    price: {type: Number, default: 0},
    expirationDate: {type: Date, default: null},
    isWishlist: {type: Boolean, default: false},
    editing: {type: Boolean, default: false},
    user: {type: String, required: true}
});

// const wishItemSchema = mongoose.Schema({
//     name: {type: String, required: true},
//     editing: {type: Boolean, default: false}
// });

// const listSchema = mongoose.Schema({
//     itemListings: [listingSchema],
//     wishList: [wishItemSchema]
// });

listingSchema.methods.serialize = function(){
    const listing = {
        id: this._id,
        title: this.title,
        dateCreated: this._id.getTimestamp(),
        editing: this.editing,
        user: this.user
    };

    if(!this.isWishlist) {
        listing.description = this.description;
        //calculate the expiration date based on difference between current date and expiration date
        listing.expiresIn = Math.round(Math.abs(new Date() - this.expirationDate.getTime())/(60*60*24*1000));
    }

    return listing
}

listingSchema.statics.createListing = function(listing){
    if (!listing.expirationDate) {
        listing.expirationDate = new Date() + 14*24*60*60*1000;
    }
    this.create(listing);
}

listingSchema.statics.createWishItem = function(wishItem){
    wishItem.isWishlist = true;
    this.create(wishItem);
}


// wishItemSchema.methods.serialize = function(){
//     return {
//         id: this._id,
//         name: this.name,
//         editing: this.editing
//     }
// }

// listSchema.methods.serialize = function(){
//     return {
//         id: this._id,
//         itemListings: this.itemListings.map(listing => listing.serialize()),
//         wishList: this.wishList.map(wishList => wishList.serialize())
//     }
// }

// const List = mongoose.model('List', listSchema);
const Listing = mongoose.model('Listing', listingSchema);
// const WishItem = mongoose.model('WishItem', wishItemSchema);

module.exports = {Listing}