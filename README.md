# regiBot
Regibot was developed using Javascript and [discord.js](https://discord.js.org/#/) for interfacing with [Discord API](https://discord.com/developers/docs/intro). Regibot allows Discord users to play [Regicide](https://boardgamegeek.com/boardgame/307002/regicide), a cooperative, fantasy card game for 2-4 players, using discord text commands.

![image](https://lh3.googleusercontent.com/pw/AM-JKLWdt8dgd3qbk6O2WitgiAqAdLxBldtynDLEJaSfYCyRyUoQ5sJFnt-Ephd_qtjGhh1rdb5bLvifFDh9wf-CekxoTCRXFG-IjJ_dYtDoNg6vHvWEqd35zpcBrLuZIKAHe54xuw_tDNV9lqwtWh5R_7us=w475-h544-no?authuser=0)

## Description
"A sinister corruption has spread throughout the four great kingdoms, blackening the hearts of once-loved Kings and Queens and those that protect them. As brave adventurers you must work together using the special powers of your champions and animal companions. Overthrow the corrupted monarchs, purge them of their darkness
and add them to your ranks so that life can be brought to the land once more."
[Rules](https://www.badgersfrommars.com/assets/RegicideRulesA4.pdf)

## Hosting regiBot locally
1. Intall discord.js
    ```
    npm install discord.js
    ```
2. Create a New Application in discord [here] (https://discord.com/developers/applications). For specific steps, follow [this guide](https://discordjs.guide/preparations/setting-up-a-bot-application.html)
    - From your discord application:
        - Grab your clientID: General Information -> Application ID
        - Grab your token: Bot -> Token (Click to Reveal Token)
    - From your discord server:
        - Grab your guildID: right click your server name -> Copy ID
3. [Add bot to server](https://discordjs.guide/preparations/adding-your-bot-to-servers.html#bot-invite-links)
4. Update index.js with your bot and channel information
    - Create a config.json file in the root directory
        ```
        {
            "clientId": "<your discord app application id>",
            "guildId": "<discord server ID for the bot>",
            "token": "<your discord app token id>"
        }
        ```
    - Uncomment line 7 of index.js and comment out lines 9-10
    ![image](https://lh3.googleusercontent.com/pw/AM-JKLU99ro1qPuHTziHYZsfYifG0NV8f5qtmCbvlsQ_46v2xsgdKW9vBboLFxYXLJiiuzxwJQsZJy40ffuoIZ9rbgIF30mZPrxBjE5q_0GT3rnZZXv7I-Hr-vZrqrA1kG_PCJXUI9nJJcjZarPh7cl40jdn=w607-h192-no?authuser=0)
4. Start the bot with node index.js

## Hosting regiBot on Heroku
1. Do steps 1 and 2 from Hosting regiBot locally
2. [Get heroku-cli](https://devcenter.heroku.com/articles/heroku-cli)
3. [Deploy to heokru](https://devcenter.heroku.com/articles/deploying-nodejs#deploy-your-application-to-heroku)
    ```
    heroku login
    heroku create   // create your heroku app
    git push heroku main    // push repository to heroku
    ```
4. [Configure](https://devcenter.heroku.com/articles/config-vars#managing-config-vars) your discord variables: clientId, guildId, and token.
    ```
    heroku config:set clientId="<your discord app application id>"
    heroku config:set guildId="<discord server ID for the bot>"
    heroku config:set token="<your discord app token id>"
    ```

## How to play
Use discord slash commands to interact with the bot.
/help will show all the available commands

![image](https://lh3.googleusercontent.com/pw/AM-JKLX15pBJkm7hnrOmoh0PujkUKOwgdmhu5vakTZGUEVVtFJ6vxL3xKIqx3XmeOevF2GxXKqLPPsUT7vBDbm2BgU09Qv_J_4QBza1cIbZTzp5DonNGU1sWa-U0wj5zXvtfwH3zRAEP8gi0Zc3jFKlBs_L7=w482-h655-no?authuser=0)
