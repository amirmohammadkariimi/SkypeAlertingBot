const User = require('../models/user');
const Conversation = require('../models/conversation');
var winston = require('../config/winston');


module.exports.isLoggedIn = async (conversationReference) => {
    let conversation;
    try {
        winston.info('finding conversation in database');
        conversation = await Conversation.findOne({
            conversationId: conversationReference.conversation.id,
        });
    } catch (err) {
        winston.error(`isLoggedIn: error finding in databse!`);
        winston.error(err);
        throw new Error('DB ERROR');
    }
    if(conversation) {
        winston.info('conversation found!');
        let user;
        try {
            winston.info('finding user in database from conversation');
            user = await User.findOne({_id: conversation.userDbId});
        } catch(err) {
            winston.error(`isLoggedIn: error finding in databse!`);
            throw new Error('DB ERROR');
        }
        return user;
    } else {
        winston.info('conversation not found!');
        return null;
    }
};