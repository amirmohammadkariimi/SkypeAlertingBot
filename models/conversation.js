const mongoose = require('mongoose');

const ConversationSchema = new mongoose.Schema({
    activityId: {
        type: String,
        required: true,
        trim: true
    },
    serviceUrl: {
        type: String,
        required: true
    },
    locale: {
        type: String,
        required: true
    },
    channelId: {
        type: String,
        required: true
    },
    conversationId: {
        type: String,
        required: true
    },
    botId: {
        type: String,
        required: true
    },
    botName: {
        type: String,
        required: true
    },
    botRole: {
        type: String,
        required: true
    },
    userId: {
        type: String,
        required: true
    },
    userName: {
        type: String,
        required: true
    },
    userRole: {
        type: String,
        required: true
    },
    userDbId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    userDbRole: {
        type: String,
        required: true,
    },
    userGroup: {
        type: String,
        required: true,
        default: 'all',
    }
});

module.exports = mongoose.model('Conversation', ConversationSchema);