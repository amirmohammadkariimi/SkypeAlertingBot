# Skype Alerting Bot

This bot has been created using [Bot Framework](https://dev.botframework.com), it provides a minimal skeleton of a bot.
You can use this bot for sending your graylog, zabbix, grafana alerts to skype chats.


## Prerequisites

- [Node.js](https://nodejs.org) version 10.14.1 or higher

    ```bash
    # determine node version
    node --version
    ```
- A Microsoft Azure account
- A URL with SSL

## To run the bot
- Config your environment variables
    ```bash
    mv .env.example .env
    ```
- Create a Azure Bot Service configured for __https://<Your URL>:3002/api/messages__ and copy **MicrosoftAppId** and **MicrosoftAppPassword** to .env in the project  folder

- Install modules

    ```bash
    npm install
    ```

- Start the bot
    - npm
        ```bash
        npm pm2
        ```
    - docker
        ```bash
        docker-compose -f deploy/docker-compose.yml up --build -d
        ```
- Create First Admin
    ```bash
    curl -H "Content-Type: application/json" --request POST --data '{"username":"<USERNAME>", "password":"<PASSWORD>", "isAdmin": "true"}' https://<BOTURL>:3002/api/register 
    ```

## To use the bot
1. Add bot to your skype (Get the url from azure bot services)
2. Login to bot by sending this message:
    ```
    <username>:<password>:all
    ```
3. Send the bot URL and Create users for other team members
    ```
    admin:create account:<newuser>:<password>:<isAdmin>
    ```
3. Add notification channels
    - Grafana
        ```
        Create a webhook notification channel
        Fill in the url with: https://<Your URL>:3002/api/notify/grafana/<YOURSECRET>
        Choose POST method
        ```
    - Zabbix
        ```
        Create a Webhook Media Type
        Fill in the url with: https://<Your URL>:3002/api/notify/zabbix/<YOURSECRET>
        ```
    - Graylog
        ```
        Create a Notification
        Choose your Stream and Http alarm callback
        Fill in the url with: https://<Your URL>:3002/api/notify/graylog/<YOURSECRET>
        ```
## Testing the bot using Bot Framework Emulator

[Bot Framework Emulator](https://github.com/microsoft/botframework-emulator) is a desktop application that allows bot developers to test and debug their bots on localhost or running remotely through a tunnel.

- Install the Bot Framework Emulator version 4.9.0 or greater from [here](https://github.com/Microsoft/BotFramework-Emulator/releases)

### Connect to the bot using Bot Framework Emulator

- Launch Bot Framework Emulator
- File -> Open Bot
- Enter a Bot URL of `http://localhost:3978/api/messages`


## Deploy the bot to Azure

This bot was generated using the Empty bot template.  Unmodified, it's not practical to deploy an empty bot to Azure, as it doesn't have any conversational behavior yet.
After making modifications to the bot and testing it locally, you can deploy it to Azure to make it accessible from anywhere.
To learn how, see [Deploy your bot to Azure](https://aka.ms/azuredeployment) for a complete set of deployment instructions.

## Further reading

- [Bot Framework Documentation](https://docs.botframework.com)
- [Bot Basics](https://docs.microsoft.com/azure/bot-service/bot-builder-basics?view=azure-bot-service-4.0)
- [Dialogs](https://docs.microsoft.com/en-us/azure/bot-service/bot-builder-concept-dialog?view=azure-bot-service-4.0)
- [Gathering Input Using Prompts](https://docs.microsoft.com/en-us/azure/bot-service/bot-builder-prompts?view=azure-bot-service-4.0)
- [Activity processing](https://docs.microsoft.com/en-us/azure/bot-service/bot-builder-concept-activity-processing?view=azure-bot-service-4.0)
- [Azure Bot Service Introduction](https://docs.microsoft.com/azure/bot-service/bot-service-overview-introduction?view=azure-bot-service-4.0)
- [Azure Bot Service Documentation](https://docs.microsoft.com/azure/bot-service/?view=azure-bot-service-4.0)
- [Azure CLI](https://docs.microsoft.com/cli/azure/?view=azure-cli-latest)
- [Azure Portal](https://portal.azure.com)
- [Language Understanding using LUIS](https://docs.microsoft.com/en-us/azure/cognitive-services/luis/)
- [Channels and Bot Connector Service](https://docs.microsoft.com/en-us/azure/bot-service/bot-concepts?view=azure-bot-service-4.0)
- [Restify](https://www.npmjs.com/package/restify)
- [dotenv](https://www.npmjs.com/package/dotenv)
