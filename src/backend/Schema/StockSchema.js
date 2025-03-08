const mongoose = require('mongoose')

const ShelfSchema = new mongoose.Schema({
    BookName: {
        type: String,
        required: true
    },
    ImgUrl: {
        type: String,
        required: false
    }, 
    Isbn: {
        type: String,
        required: false
    }, 
    Author: {
        type: String
    }

}, { timestamps: true })

const Shelf = mongoose.model('Shelf', ShelfSchema)
module.exports = Shelf