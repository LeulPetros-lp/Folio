const mongoose = require('mongoose')

const MemberSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "Please Enter Name"]
    },
    parentPhone: {
        type: Number,
        required: true,
    },
    age: {
        type: Number,
        required: true
    },
    grade: {
        type: String,
        required: true
    },
    section: {
        type: String,
        required: true
    },
}, { timestamps: true })


const Members = mongoose.model('Members', MemberSchema)
module.exports = Members