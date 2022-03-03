# regiBot
Regibot was developed using Javascript and [discord.js](https://discord.js.org/#/) for interfacing with [Discord API](https://discord.com/developers/docs/intro). Regibot allows Discord users to play [Regicide](https://boardgamegeek.com/boardgame/307002/regicide), a cooperative, fantasy card game for 2-4 players, using discord text commands.

![image](https://lh3.googleusercontent.com/BCY3YYW78Yj_DJJklR7UeujxG8m0UScx2dT2ETK64elObNnsAwWRq_pSiwpVHnF-LWEMqMhbCM7We4-tpDJws4bkFWYEOALegYgQR59yDC8bly9M3ZwigtGZUtCE_Kwen8P0x40KqQKEQoyj2uWYIEy8iN8aQc-ooPUj5G1LejK2bLoA2rZdsWcCFVv_nnaiBbseqwzZyb1gH0Qte-hJOImqESVJYBZi6kr--MDfYRdaeXl5UvGcYEEBJRcNKSCsg6kjUiSjoHsG00EwqV8uTCw5lrZB6cSszOhW7rMVJ9RLlkMUbWVAfF_1NdZzrnEyEIFZBl5R7OVrPDsYnoW1FPz2pKTheZWRd3jT6yH8hyKfssqNfKRfXukSsBiG0a0f2VeQVcL5PRz2Q7MT49F96UjkSiYd4Dwj0gS-bVNDtgOIPRtaqjzkJSE7Wr1o_Jhkyo3kIPx8MAEecWcatnZli2WOJ2W1AgYkh4kYVtxag9WeT1h7Dv8b2nPE-Pxw4V3054kXiC4rINB0eX69Mdj5F_OcP1pTpbd0dikO6plbLesHno6q34d_sqd_XSeY-e5OXX6H6_iklHs-89rmb7xJOjeCZTpGVAlnNqf6-ju-UnYV5krihtQ_oH-pz3MnWkpMUoOG98E6mnDmgw-KWrz1iJNEJy3XiOoJ2wD2lQVqyFkJLHDBXZVgQnZg7_JEHHArH2SZn1Zs-Pkv53sLSUmBFE0=w475-h544-no?authuser=0)

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
    ![image](https://lh3.googleusercontent.com/RVqAg7Cy_KD264FHYdAKziSdMq4iwnKn5OVKlY3MGlBXdzIBz9-TkXZIcF2dETo5lKwZeQv4mrkmpMm2hqwuWBMWYsVIPzjCiaVLMlQECJDb_apPsU7EzIi4SSLBZ9nNlrubDraUQYkYsZhUnKYYXmvei3nx-68fs_9dK9YgCoh681gPIetDxVOk6Iyd1G_94HBMUSeAUHstgKoAtaJj2V7ePjgSqY8EMkwDB58Ui3w4g3aICsy1tFEhsakfv-guFkE11021Zg0eF5RsHT1lV8RID_f-CgiMz92UhN9lqWmJ_bK53E6iWUjGMDQ4vCoU93uXxnMpx8_k2yLFecyZqZjLSRCj1aJcZXWazgVVPahkKgJ3WJQNaiHJt-20aZ7ngUIwPysabPFjKehqyiwI2Tap7VF-B_0QUoyHuSNVauunS83cw5A9Lbr-1dntqAquzSXu9C7L6D7uK96qRoAA3Ywh7dDVCbpMA-43OK8BvXF2u0Vv2-baoW2W1eNQ2mOwfUfDiESo93oJvkf-XV_yw3Ry2as_4gSrG76Kw5oMsoVUmqov-ajFi-AM-NZtopV4xWQVIzptRRzkP3D-asRKeLiTbdHNrcZOWdcNcthF-yHJ3HdPAPXIxIJPcmstEGwy8g_Qpw_pSDnvT9c7nmCj-CfBFJerg7jOCI98LDMD70oBFzMGpnUpbL3PMIyhmIN_5T6om-zvw5z05IYx-QHfziw=w607-h192-no?authuser=0)
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

![image](https://lh3.googleusercontent.com/B8Gm-j9EHCEMoefuVhRRxhXNM7bWvMKCvzvKwIrhMtMjCNxThcREZt0EOCLmymb2CmQZRW53lcgx2pjWV8tyoUy3Ap1EvscOVcikpc7otbmcY5Xtlo4bDwlPmeDAS90kQKYxLdhBDwTW1JnvJ1s50XQ0lKozGOUzq4glg4xppHbPtmYbRAwTGTbwqI6qhefl-dkPGYu08D_mr9dKy4S7YlMUe5mGrz7147HriE5ouIq7XyvbwY3RqjB27gfI1ZzAjRExOVfQlnw3EA6ZsiPHMjvoTbNcTCkkyR0E64wae5q1qsfJok5sRChKxr7xZ3bzd7JRivFti7WI01Hk43LHE4Nt-Lm9wOalPARgKdzjJWaKh_xmYK6jFeIZdXyMGmL1fLEIe7jzMBGby0O6JEjHf80m-Q6C0jukioos1Xilf-DtVTTiFsQ-rwaY7CwgCnf8PKtAb3yEGA6C2-ST2bb3EvTJ41MT8LLv9NhKqmE6qRBHsIpSEaPaQ4uewC2MATjZXWms5uO39MEyXDOt9yqw02drdNS0Zz2e-vDVazcBo6UJPeqFvd8ACww_VDk_ZI-Q0tpAukPnGIJZpTEy3feLa_piiEk-MoStfS2H-vD4tWfz8H56juLzC5pYyMs1--9oIhIiqXaSySvbWW9hmoufP0SDPMIb42D6xILvgHfCsbEd-w0Wa37fZxAfNwFQYgJPVQnc_hhWhWrsoSGb-OC-sNQ=w482-h655-no?authuser=0)