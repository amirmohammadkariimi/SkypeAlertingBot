// Import required packages
const path = require('path');
// Note: Ensure you have a .env file and include the MicrosoftAppId and MicrosoftAppPassword.
const ENV_FILE = path.join(__dirname, '.env');
require('dotenv').config({ path: ENV_FILE });

const restify = require('restify');
const mongoose = require('mongoose');
//logging
var morgan = require('morgan');
var winston = require('./config/winston');

const {MESSAGES} = require('./config/message');

const User = require('./models/user');
const Conversation = require('./models/conversation');

//Import required bot services.
//See https://aka.ms/bot-services to learn more about the different parts of a bot.
const { BotFrameworkAdapter } = require('botbuilder');
// This bot's main dialog.
const { AlertingBot } = require('./bots/alerting');



// Create adapter.
// See https://aka.ms/about-bot-adapter to learn more about adapters.
const adapter = new BotFrameworkAdapter({
    appId: process.env.MicrosoftAppId,
    appPassword: process.env.MicrosoftAppPassword
});
// Catch-all for errors.
adapter.onTurnError = async (context, error) => {
    // This check writes out errors to console log .vs. app insights.
    // NOTE: In production environment, you should consider logging this to Azure
    //       application insights. See https://aka.ms/bottelemetry for telemetry 
    //       configuration instructions.
    winston.error(`[onTurnError] unhandled error: ${ error }`);

    // Send a trace activity, which will be displayed in Bot Framework Emulator
    await context.sendTraceActivity(
        'OnTurnError Trace',
        `${ error }`,
        'https://www.botframework.com/schemas/error',
        'TurnError'
    );
};

// Create HTTP server.
const server = restify.createServer({
    maxParamLength: 1000
});
server.listen(process.env.port || process.env.PORT || 3978, function() {
    winston.info(`\n${ server.name } listening to ${ server.url }`);
    winston.info('connecting to database');
    mongoose.connect(process.env.MONGODB);
    });

// applying morgan to log all the requests
server.use(morgan('combined', { stream: winston.stream }));

const database = mongoose.connection;
database.on('error', (err) => {
    winston.error('mongoose Error', err);
})

server.use(restify.plugins.bodyParser({
    requestBodyOnGet: true
}));

database.once('open', () => {
    require('./routes/user')(server);
    winston.info(`\n${ server.name } listening to ${ server.url }`);
})

// creating conversationRefrences
const conversationReferences = {};

/* 
    get all conversationRefrences and build the conversationRefrences variable
    conversationRefrences: {conversationId: [conversationRefrence, userGroup]}
*/
Conversation.find({}).then( conversationQuery => {
    for (con of conversationQuery) {
        conversationReferences[con.conversationId] = [{
            activityId: con.activityId,
            user: {
                id: con.userId,
                name: con.userName,
                role: con.userRole
            },
            bot: {
                id: con.botId,
                name: con.botName,
                role: con.botRole
            },
            conversation: { id: con.conversationId },
            channelId: con.channelId,
            locale: con.locale,
            serviceUrl: con.serviceUrl
        },
        con.userGroup,
        con.userDbId
    ];
    }
});


// Create the main dialog.
const bot = new AlertingBot(conversationReferences);

// Listen for incoming activities and route them to your bot main dialog.
server.post('/api/messages', (req, res) => {
    adapter.processActivity(req, res, async (turnContext) => {
        // route to main dialog.
        await bot.run(turnContext);
    });
});

// Listen for incoming notifications on Zabbix and send proactive messages to users.
server.post('/api/notify/zabbix/:secret', async (req, res, next) => {
    const { message, username } = req.body;
    const secret = req.params.secret;
    if(secret !== process.env.SECRET) {
        res.send(401);
        return next();
    }
    if(!message || !username) {
        res.send(400);
        return next();
    }
    let userId;
    try {
        const user = await User.findOne({username}).select('_id');
        userId = user["_id"];
        if(!userId) {
            res.send(404);
            return next();
        }
    } catch(err) {
        winston.error(`Zabbix: Error Finding Username!`);
        winston.error(err);
    }
    let convs = [];
    try {
        const cons = await Conversation.find({userDbId: mongoose.Types.ObjectId(userId)}).where('userGroup').in(['zabbix', 'all']);
        for (con of cons) {
            convs.push({
                activityId: con.activityId,
                user: {
                    id: con.userId,
                    name: con.userName,
                    role: con.userRole
                },
                bot: {
                    id: con.botId,
                    name: con.botName,
                    role: con.botRole
                },
                conversation: { id: con.conversationId },
                channelId: con.channelId,
                locale: con.locale,
                serviceUrl: con.serviceUrl
            });
        }
    } catch(err) {
        winston.error(`Zabbix: Error Finding Cons!`);
        winston.error(err);
    }

    for (const conversationReference of convs) {
        // send to all || zabbix group
        winston.info(`sending ${conversationReference.user.name}`);
        try {
            await adapter.continueConversation(conversationReference, async turnContext => {
                await turnContext.sendActivity(message);
            });
        } catch(err) {
            winston.error(`Zabbix: Error Sending message To user ${conversationReference.user.name}!`);
            winston.error(err);
        }
    }
    res.send(200);
    return next();
});
// Listen for incoming notifications on Grafana and send proactive messages to users.
server.post('/api/notify/grafana/:secret', async (req, res, next) => {
    const { message, ruleUrl, state, ruleName } = req.body;
    const secret = req.params.secret;
    if(secret !== process.env.SECRET) {
        res.send(401);
        return next();
    }
    if(!message || !state) {
        res.send(400);
        return next();
    }
    const replyMessage =
    `${ruleName} --- ${state}\n
        message: ${message}\n
        ${ruleUrl}
    `;
    let convs = [];
    try {
        const cons = await Conversation.find().where('userGroup').in(['grafana', 'all']);
        for (con of cons) {
            convs.push({
                activityId: con.activityId,
                user: {
                    id: con.userId,
                    name: con.userName,
                    role: con.userRole
                },
                bot: {
                    id: con.botId,
                    name: con.botName,
                    role: con.botRole
                },
                conversation: { id: con.conversationId },
                channelId: con.channelId,
                locale: con.locale,
                serviceUrl: con.serviceUrl
            });
        }
    } catch(err) {
        winston.error(`Grafana: Error Finding Cons!`);
        winston.error(err);
    }

    for (const conversationReference of convs) {
        winston.info(`sending ${conversationReference.user.name}`);
        try {
            await adapter.continueConversation(conversationReference, async turnContext => {
                // If you encounter permission-related errors when sending this message, see
                // https://aka.ms/BotTrustServiceUrl
                await turnContext.sendActivity(replyMessage);
            });
        } catch(err) {
            winston.error(`Grafana: Error Sending message To user ${conversationReference.user.name}!`);
            winston.error(err);
        }
    }
    res.send(200);
    return next();
});
server.post('/api/notify/graylog/:secret', async (req, res, next) => {
    const { result_description, triggered } = req.body['check_result'];
    const { title } = req.body['check_result']['triggered_condition'];
    const secret = req.params.secret;
    if(secret !== process.env.SECRET) {
        res.send(401);
        return next();
    }
    if(!message || !result_description) {
        res.send(400);
        return next();
    }
    const replyMessage =
    `${title} --- ${triggered}\n
        message: ${result_description}
    `;
    let convs = [];
    try {
        const cons = await Conversation.find().where('userGroup').in(['grafana', 'all']);
        for (con of cons) {
            convs.push({
                activityId: con.activityId,
                user: {
                    id: con.userId,
                    name: con.userName,
                    role: con.userRole
                },
                bot: {
                    id: con.botId,
                    name: con.botName,
                    role: con.botRole
                },
                conversation: { id: con.conversationId },
                channelId: con.channelId,
                locale: con.locale,
                serviceUrl: con.serviceUrl
            });
        }
    } catch(err) {
        winston.error(`Graylog: Error Finding Cons!`);
        winston.error(err);
    }

    for (const conversationReference of convs) {
        winston.info(`sending ${conversationReference.user.name}`);
        try {
            await adapter.continueConversation(conversationReference, async turnContext => {
                // If you encounter permission-related errors when sending this message, see
                // https://aka.ms/BotTrustServiceUrl
                await turnContext.sendActivity(replyMessage);
            });
        } catch(err) {
            winston.error(`Graylog: Error Sending message To user ${conversationReference.user.name}!`);
            winston.error(err);
        }
    }
    res.send(200);
    return next();
});

// error handler
server.use(function(err, req, res, next) {
 
    // add this line to include winston logging
    winston.error(`${err.status || 500} - ${err.message} - ${req.originalUrl} - ${req.method} - ${req.ip}`);
  
    // render the error page
    if(process.env.NODE_ENV === 'development') {
        res.send(err.status || 500, {message: err.message});
    } else {
        res.send(err.status || 500, {message: MESSAGES.INTERNAL});
    }
    return next();
});

