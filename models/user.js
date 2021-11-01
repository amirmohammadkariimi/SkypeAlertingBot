const mongoose = require('mongoose');
var uniqueValidator = require('mongoose-unique-validator');

const UserSchema = new mongoose.Schema({
    username    : {
        type    : String,
        required: true,
        trim    : true,
        unique  : true,
    },
    password    : {
        type    : String,
        required: true,
    },
    isAdmin     : {
        type    : Boolean,
        required: true,
        default : false
    },
});

UserSchema.plugin(uniqueValidator, {message: 'is already taken.'});

module.exports = mongoose.model('User', UserSchema);