const winston = require('../config/winston');
const User = require('../models/user');
const Conversation = require('../models/conversation');

module.exports.deleteAccount = async (username) => {
    let deletingUser;
    try {
        deletingUser = await User.findOne({username});
        if(!deletingUser) {
            return null;
        }
    } catch(err) {
        winston.error('error finding user from db');
        winston.error(err);
        throw new Error('Error Finding User From DB');
    }
    try {
        winston.info(`deleting conversatoins for ${deletingUser}`);
        const deletingCons = await Conversation.deleteMany({
            userDbId: deletingUser._id,
        });
    } catch(err) {
        winston.error('error deleting conversation from db');
        winston.error(err);
        throw new Error('Error Deleting Conversation From DB');
    }
    try {
        winston.info(`deleting user ${deletingUser}`);
        deletingUser = await User.deleteOne({_id: deletingUser._id});
        return deletingUser;
    } catch(err) {
        winston.error('error deleting user from db');
        winston.error(err);
        throw new Error('Error Deleting User From DB');
    }
};