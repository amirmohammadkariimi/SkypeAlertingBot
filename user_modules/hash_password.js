const bcrypt = require('bcryptjs');

const User = require('../models/user');
const Conversation = require('../models/conversation');

var winston = require('../config/winston');

module.exports.hashPassword = async (user, password) => {
    let result;
    let hash;
    try {
        hash = await bcrypt.hash(password, 10);
    } catch(err) {
        winston.error('error hashing passowrd');
        winston.error(err);
    }
    user.password = hash;
    try {
        winston.info('saving user in database');
        const newUser = await user.save();
        result = newUser;
    } catch(err) {
        winston.error('Error saving user in database');
        console.log(err)
        winston.error(err);
        throw new Error('Error Saving User In DB');
    }
    return result;
};