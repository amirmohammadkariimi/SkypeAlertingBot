// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT License.

const { ActivityHandler, TurnContext } = require('botbuilder');

const bcrypt = require('bcryptjs');

const User = require('../models/user');
const Conversation = require('../models/conversation');

const {isLoggedIn} = require('../user_modules/check_login');
const {hashPassword} = require('../user_modules/hash_password');
const {deleteAccount} = require('../user_modules/delete_account');

const {MESSAGES} = require('../config/message');

const winston = require('../config/winston');

class AlertingBot extends ActivityHandler {
    constructor(conversationReferences) {
        super();

        // Dependency injected dictionary for storing ConversationReference objects used in NotifyController to proactively message users
        this.conversationReferences = conversationReferences;

        this.onMembersAdded(async (context, next) => {
            const membersAdded = context.activity.membersAdded;
            for (let cnt = 0; cnt < membersAdded.length; cnt++) {
                if (membersAdded[cnt].id !== context.activity.recipient.id) {
                    const welcomeMessage = MESSAGES.WELCOME;
                    await context.sendActivity(welcomeMessage);
                }
            }

            // By calling next() you ensure that the next BotHandler is run.
            await next();
        });

        this.onMessage(async (context, next) => {
            const sentText = context.activity.text;
            const conversationReference = TurnContext.getConversationReference(context.activity);
            const loggedInUser = await isLoggedIn(conversationReference);
            if (loggedInUser) {
                if (sentText.indexOf(':') === -1) {
                    if (sentText.toLowerCase() === 'logout') {
                        try {
                            await Conversation.deleteOne({
                                conversationId: conversationReference.conversation.id
                            });
                            await context.sendActivity(MESSAGES.LOGGEDOUT);
                        } catch(err) {
                            winston.error('error logging out the user');
                            winston.error(err);
                            await context.sendActivity(MESSAGES.ERROR);
                        }
                    } else if (sentText.toLowerCase() == 'delete account') {
                        winston.info('running delete account for user');
                        try {
                            const deletedUser = await deleteAccount(loggedInUser.username);
                            await context.sendActivity(MESSAGES.DELETEACCOUNT);
                        } catch (err) {
                            winston.error(err)
                            await context.sendActivity(MESSAGES.ERROR);
                        }
                    } else {
                        if(loggedInUser.isAdmin === true) {
                            await context.sendActivity(MESSAGES.ADMINHELP);
                        } else {
                            await context.sendActivity(MESSAGES.HELP);
                        }
                    }
                } else {
                    const textArray = sentText.split(':');
                    if (textArray[0].toLowerCase() === 'change password') {
                        winston.info('running hash password from BOT change password!');
                        try {
                            const newUser = await hashPassword(loggedInUser, textArray[1]);
                            await context.sendActivity(MESSAGES.CHANGEPASS);
                        } catch (err) {
                            winston.error(err)
                            await context.sendActivity(MESSAGES.ERROR);
                        }
                    } else if (textArray[0].toLowerCase() === 'group') {
                        const con = await Conversation.findOne({
                            conversationId: conversationReference.conversation.id
                        });
                        con.userGroup = textArray[1];
                        const newConRef = await con.save();
                        await context.sendActivity(MESSAGES.GROUPCHANGE);
                    } else if (textArray[0].toLowerCase() === 'admin') {
                        if (textArray[1].toLowerCase() === 'create account') {
                            const username = textArray[2].toLowerCase();
                            const password = textArray[3];
                            const isAdmin = textArray[4];
                            const user = await User.findOne({ username });
                            if (user) {
                                await context.sendActivity(MESSAGES.USEREXISTS);
                            } else {
                                const user = new User({
                                    username,
                                    password,
                                    isAdmin
                                });
                                winston.info('running hash password from ADMIN BOT create user!');
                                try {
                                    const newUser = await hashPassword(user, user.password);
                                    await context.sendActivity(MESSAGES.CREATEUSER);
                                } catch (err) {
                                    winston.error(err)
                                    await context.sendActivity(MESSAGES.ERROR);
                                }
                            }
                        } else if (textArray[1].toLowerCase() === 'delete account') {
                            const username = textArray[2].toLowerCase();
                            winston.info('running delete account for admin');
                            try {
                                const deletedUser = await deleteAccount(username);
                                await context.sendActivity(MESSAGES.ADMINDELETEACCOUNT);
                            } catch (err) {
                                winston.error(err)
                                await context.sendActivity(MESSAGES.ERROR);
                            }
                        } else if(textArray[1].toLowerCase() === 'show accounts') {
                            winston.info('running show accounts for admin');
                            try {
                                const accounts = await User.find({});
                                let result = [];
                                for(let account of accounts) {
                                    result.push(account.username);
                                }
                                await context.sendActivity(`Users: ${result}`);
                            } catch (err) {
                                winston.error(err)
                                await context.sendActivity(MESSAGES.ERROR);
                            }
                        } else {
                            await context.sendActivity(MESSAGES.ADMINHELP);
                        }
                    } else {
                        await context.sendActivity(MESSAGES.HELP);
                    }
                }
            } else {
                if (sentText.indexOf(':') != -1) {
                    const username = sentText.split(':')[0];
                    const password = sentText.split(':')[1];
                    const group = sentText.split(':')[2];
                    let user;
                    try {
                        user = await User.findOne({ username });
                    } catch (err) {
                        winston.error(err);
                        await context.sendActivity(MESSAGES.WRONGACC);
                    }
                    if(user) {
                        // Match User email with password
                        let isMatch = false
                        try {
                            const isMatch = await bcrypt.compare(password, user.password);
                            if (isMatch == true) {
                                winston.info('adding ', context.activity);
                                await this.addConversationReference(conversationReference, user, group);
                                if (user.isAdmin) {
                                    await context.sendActivity(MESSAGES.LOGGEDINADMIN);
                                } else {
                                    await context.sendActivity(MESSAGES.LOGGEDINUSER);
                                }
                                await context.sendActivity(MESSAGES.HELPINTRO);
                            } else {
                                await context.sendActivity(MESSAGES.WRONGACC);
                            }
                        } catch (err) {
                            winston.error('error user logging in');
                            winston.error(err);
                        }   
                    } else {
                        await context.sendActivity(MESSAGES.WRONGACC);
                    }   
                } else {
                    await context.sendActivity(MESSAGES.ONLYLOGIN);
                }
            }
            await next();
        });
    }

    async addConversationReference(conversationReference, user, group) {
        this.conversationReferences[conversationReference.conversation.id] = [conversationReference, group];
        const conRef = new Conversation({
            activityId: conversationReference.activityId,
            serviceUrl: conversationReference.serviceUrl,
            locale: conversationReference.locale,
            channelId: conversationReference.channelId,
            conversationId: conversationReference.conversation.id,
            botId: conversationReference.bot.id,
            botName: conversationReference.bot.name,
            botRole: conversationReference.bot.role || 'bot',
            userId: conversationReference.user.id,
            userName: conversationReference.user.name,
            userRole: conversationReference.user.role || 'user',
            userDbId: user._id,
            userDbRole: user.isAdmin,
            userGroup: group,
        });
        const newConRef = await conRef.save();
        console.log('newConRef Added To DB')
    }
}

module.exports.AlertingBot = AlertingBot;
