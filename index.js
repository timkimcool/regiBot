const { REST } = require('@discordjs/rest');
const { Client, Collection, Intents } = require('discord.js');
const { Routes } = require('discord-api-types/v9');

const fs = require('fs');
const { token, clientId, guildId } = require('./config.json');
const Game = require('./game.js');

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

// read events
const eventFiles = fs.readdirSync('./events').filter(file => file.endsWith('.js'));
for (const file of eventFiles) {
	const event = require(`./events/${file}`);
	if (event.once) {
		client.once(event.name, (...args) => event.execute(...args));
	} else {
		client.on(event.name, (...args) => event.execute(...args));
	}
}

// // get commands
client.commands = new Collection();
const commands = [];
const commandFiles = fs.readdirSync('./commands').filter(file => file.endsWith('.js'));
for (const file of commandFiles) {
	const command = require(`./commands/${file}`);
	client.commands.set(command.data.name, command);
	commands.push(command.data.toJSON());
}
// load slash commands
const rest = new REST({ version: '9' }).setToken(token);
(async () => {
  try {
    console.log('Started refreshing application (/) commands.');
    // guild commands updated instantly
    await rest.put(
      Routes.applicationGuildCommands(clientId, guildId),
      { body: commands },
    );
    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();


// bot state
let members = [];
let memberThreads = [];
const BotPhase = {
	IDLE: 'idle',
	WAITING_FOR_JOIN: 'waiting for join',
	WAITING_FOR_PLAY: 'waiting for play',
	WAITING_FOR_DISCARD: 'waiting for discard',
  WAITING_FOR_JESTER: 'waiting for jester',
}
let currBotPhase = BotPhase.IDLE;
let gameState = null;
const privacyStr = '--------------------------------------------------------------\n';

function resetBotState() {
  for (let i = 0; i < members.length; i++) {
    memberThreads[i].members.remove(members[i].id);
    memberThreads[i].leave();
  }
  members = [];
  memberThreads = [];
  currBotPhase = BotPhase.IDLE;
  gameState = null;
}

// read interactions
client.on('interactionCreate', async interaction => {
	if (!interaction.isCommand() || !client.commands.get(interaction.commandName)) return;
  const channel = interaction.channel;
	try {
		switch (interaction.commandName) {
			case 'ping': {
				channel.send('**[Pong]**');
				break;
      }
			case 'new-game': {
				if (currBotPhase !== BotPhase.IDLE) {
					await interaction.reply({ content: 'Game is already in progress!', ephemeral: true });
          break;
				}
        currBotPhase = BotPhase.WAITING_FOR_JOIN;
        channel.send('**[New Game: /join to enter the game]**');
				break;
      }
			case 'join': {
				if (currBotPhase !== BotPhase.WAITING_FOR_JOIN) {
					await interaction.reply({ content: 'Please start a new game first! (/new-game)', ephemeral: true });
          break;
				}
        if (members.length === 4) {
          await interaction.reply({ content: 'Maximum players reached!', ephemeral: true });
          break;
        }
        const member = interaction.member;
        // if (members.find(m => m.id === member.id)) {
        //   await interaction.reply({ content: 'You have already joined the game.', ephemeral: true });
        //   break;
        // }
        members.push(member);
        channel.send(`**[${member.displayName} has joined the game]**`);
				break;
      }
			case 'start': {
				if (currBotPhase !== BotPhase.WAITING_FOR_JOIN) {
					await interaction.reply({ content: `Unable to start game because the BotPhase is: ${currBotPhase}`, ephemeral: true });
          break;
				}
        if (members.length < 2) {
					channel.send(`**[Not enough players to start the game]**`);
          break;
        }
        for (const member of members) {
          const thread = await channel.threads.create({
            name: `${member.displayName} hand`,
            reason: 'Separate thread for your hand',
            autoArchiveDuration: 60,
          });
          memberThreads.push(await thread);
          await thread.members.add(member.id);
          await thread.setArchived();
        }
        gameState = Game.initState(members);
        currBotPhase = BotPhase.WAITING_FOR_PLAY;
        channel.send(Game.stringifyState(gameState));
        for (let i = 0; i < members.length; i++) {
          const handStr = gameState.players[i].hand.map(Game.stringifyCard).join(' ');
          memberThreads[i].send(privacyStr + (handStr ? handStr : '(empty)'));
        }
				break;
      }
			case 'play': { 
        if (currBotPhase !== BotPhase.WAITING_FOR_PLAY) {
          await interaction.reply({ content: `Invalid command; the current BotPhase is: ${currBotPhase}`, ephemeral: true });
          break;
				}
        if (interaction.member.user.username !== Game.getCurrPlayerName(gameState)) {
          await interaction.reply({ content: `It is not your turn to play.`, ephemeral: true });
          break;
        }
        const input = interaction.options.getString('cards');
        if (!Game.isValidInput(input)) {
          await interaction.reply({ content: `Invalid play input.`, ephemeral: true });
          break;
        }
        if (input === 'yield') {
          if (gameState.yieldCount === gameState.players.length - 1) {
            channel.send(`**[Players can no longer yield consecutively]**`);
            break;
          }
          channel.send(`**[${Game.getCurrPlayerName(gameState)} yielded]**`);
          gameState.yieldCount++;
        } else { // regular play
          const play = Game.parseCards(input);
          // STEP 1: play card(s)
          if (!Game.doCardsExistInHand(gameState, play)) {
            await interaction.reply({ content: `You don't have the cards to make this play.`, ephemeral: true });
            break;
          }
          if (!Game.isValidPlay(play)) { 
            await interaction.reply({ content: `The play you made is invalid.`, ephemeral: true });
            break;
          }
          gameState.yieldCount = 0;
          Game.makePlay(gameState, play);
          channel.send(`**[${Game.getCurrPlayerName(gameState)} played: ${play.map(Game.stringifyCard).join(', ')}]**`);
          const handStr = Game.getCurrPlayerHand(gameState).map(Game.stringifyCard).join(' ');
          memberThreads[gameState.currPlayerIdx].send(privacyStr + (handStr ? handStr : '(empty)'));
          if (play.length === 1 && play[0].value === Game.jesterValue) {
            gameState.isJesterPlayed = true;
            currBotPhase = BotPhase.WAITING_FOR_JESTER;
            channel.send(Game.stringifyState(gameState));
            channel.send(`**[/jester to select whose turn it is next]**`);
            break;
          }
          // STEP 2: suit power (reds)
          const activeSuits = Game.getCurrPlayerActiveSuits(gameState);
          const attackValue = Game.getCurrPlayerAttackValue(gameState);
          if (activeSuits.includes(Game.Suit.HEART)) {
            Game.healFromDiscardPile(gameState, attackValue);
          }
          if (activeSuits.includes(Game.Suit.DIAMOND)) {
            Game.dealCards(gameState, attackValue);
            // TODO: don't send to player who has no change in hand.
            for (let i = 0; i < members.length; i++) {
              const handStr = gameState.players[i].hand.map(Game.stringifyCard).join(' ');
              memberThreads[i].send(privacyStr + (handStr ? handStr : '(empty)'));
            }
          }
          // STEP 3: deal damage
          const playerAttackValue = Game.getCurrPlayerAttackValue(gameState);
          gameState.royal.health -= playerAttackValue;
          if (gameState.royal.health <= 0) {
            Game.discardPlayerPlays(gameState);
            gameState.isJesterPlayed = false;
            if (gameState.royal.health === 0) {
              gameState.tavernDeck.unshift(gameState.royal.activeCard);
              channel.send(`**[${Game.stringifyCard(gameState.royal.activeCard)} has been moved to the Tavern Deck]**`);
            } else {
              gameState.discardPile.push(gameState.royal.activeCard);
            }
            gameState.royal.activeCard = null;
            gameState.royal.health = null;
            if (gameState.castleDeck.length === 0) {
              channel.send('**[You won Regicide]**');
              resetBotState();
              break;
            } else {
              Game.drawNewRoyal(gameState);
              channel.send(Game.stringifyState(gameState));
              break;
            }
          }
        }
        // STEP 4: receive damage
        const royalAttackValue = Game.getRoyalAttackValue(gameState);
        if (royalAttackValue === 0) {
          gameState.currPlayerIdx = [gameState.currPlayerIdx + 1] % gameState.players.length;
          if (Game.getCurrPlayerHand(gameState).length === 0) {
            channel.send(Game.stringifyState(gameState));
            channel.send(`**[Game Over: ${gameState.players[gameState.currPlayerIdx].displayName} has no more cards]**`);
            resetBotState();
            break;
          }
          channel.send(Game.stringifyState(gameState));
          break;
        }
        if (royalAttackValue > Game.getCurrPlayerHealth(gameState)) {
          channel.send(`**[Game Over: attack: ${royalAttackValue}, health remaining: ${Game.getCurrPlayerHealth(gameState)}]**`);
          resetBotState();
          break;
        }
        currBotPhase = BotPhase.WAITING_FOR_DISCARD;
        channel.send(Game.stringifyState(gameState));
        channel.send(`**[Waiting for /discard against attack: ${royalAttackValue}]**`);
				break;
      }
      case 'jester': {
        if (currBotPhase !== BotPhase.WAITING_FOR_JESTER) {
          await interaction.reply({ content: `Invalid command; the current BotPhase is: ${currBotPhase}`, ephemeral: true });
          break;
        }
        if (interaction.member.user.username !== Game.getCurrPlayerName(gameState)) {
          await interaction.reply({ content: `It is not your turn to play.`, ephemeral: true });
          break;
        }
        const displayName = interaction.options.getString('display-name');
        if (!members.map(m => m.displayName).includes(displayName)) {
          await interaction.reply({ content: `The player you selected is not recognized: ${displayName}`, ephemeral: true });
          break;
        }
        channel.send(`**[${gameState.players[gameState.currPlayerIdx].displayName} selected ${displayName}]**`);
        gameState.currPlayerIdx = gameState.players.findIndex(player => player.displayName === displayName);
        if (Game.getCurrPlayerHand(gameState).length === 0) {
          channel.send(Game.stringifyState(gameState));
          channel.send(`**[Game Over: ${gameState.players[gameState.currPlayerIdx].displayName} has no more cards]**`);
          resetBotState();
          break;
        }
        currBotPhase = BotPhase.WAITING_FOR_PLAY;
        channel.send(Game.stringifyState(gameState));
        break;
      }
			case 'discard': {
				if (currBotPhase !== BotPhase.WAITING_FOR_DISCARD) {
					await interaction.reply({ content: `Invalid command; the current BotPhase is: ${currBotPhase}`, ephemeral: true });
          break;
				}
        if (interaction.member.user.username !== Game.getCurrPlayerName(gameState)) {
          await interaction.reply({ content: `It is not your turn to discard.`, ephemeral: true });
          break;
        }
        const input = interaction.options.getString('cards');
        if ([Game.jesterValue, 'yield'].includes(input) || !Game.isValidInput(input)) {
          await interaction.reply({ content: `Invalid discard input.`, ephemeral: true });
          break;
        }
        const discardCards = Game.parseCards(interaction.options.getString('cards'));
        if (!Game.doCardsExistInHand(gameState, discardCards)) {
          await interaction.reply({ content: `You don't have the cards for this discard.`, ephemeral: true });
          break;
        }
        // TODO: check if value is excessive(?)
        // TODO: extract & generalize
        const discardValue = discardCards.reduce((sum, card) => (
          sum + Game.attackValueMap[card.value]
        ), 0);
        const royalAttackValue = Game.getRoyalAttackValue(gameState);
        if (discardValue < royalAttackValue) {
          await interaction.reply({ content: `Discard value of (${discardValue}) is not enough against attack: (${royalAttackValue})`, ephemeral: true });
          break;
        }
        Game.discard(gameState, discardCards);
        channel.send(`**[${Game.getCurrPlayerName(gameState)} discarded: ${discardCards.map(Game.stringifyCard).join(', ')}]**`);
        const handStr = Game.getCurrPlayerHand(gameState).map(Game.stringifyCard).join(' ');
        memberThreads[gameState.currPlayerIdx].send(privacyStr + (handStr ? handStr : '(empty)'));
        gameState.currPlayerIdx = [gameState.currPlayerIdx + 1] % gameState.players.length;
        if (Game.getCurrPlayerHand(gameState).length === 0) {
          channel.send(Game.stringifyState(gameState));
          channel.send(`**[Game Over: ${gameState.players[gameState.currPlayerIdx].displayName} has no more cards]**`);
          resetBotState();
          break;
        }
        currBotPhase = BotPhase.WAITING_FOR_PLAY;
        channel.send(Game.stringifyState(gameState));
        break;
      }
			case 'end-game': {
				channel.send('**[Game has ended]**');
        resetBotState();
				break;
      }
		}
		// await command.execute(interaction);
	} catch (error) {
		console.error(error);
		await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
	}
});

client.login(token);

// function botSendMessage() {}

// function botSendEmbedMessage(channel, msg) {
// 	const exampleEmbed = {
// 		color: 0x0099ff,
// 		title: 'Some title',
// 		url: 'https://discord.js.org',
// 		author: {
// 			name: 'Some name',
// 			icon_url: 'https://i.imgur.com/AfFp7pu.png',
// 			url: 'https://discord.js.org',
// 		},
// 		description: 'Some description here',
// 		thumbnail: {
// 			url: 'https://i.imgur.com/AfFp7pu.png',
// 		},
// 		fields: [
// 			{
// 				name: 'Regular field title',
// 				value: 'Some value here',
// 			},
// 			{
// 				name: '\u200b',
// 				value: '\u200b',
// 				inline: false,
// 			},
// 			{
// 				name: 'Inline field title',
// 				value: 'Some value here',
// 				inline: true,
// 			},
// 			{
// 				name: 'Inline field title',
// 				value: 'Some value here',
// 				inline: true,
// 			},
// 			{
// 				name: 'Inline field title',
// 				value: 'Some value here',
// 				inline: true,
// 			},
// 		],
// 		image: {
// 			url: 'https://i.imgur.com/AfFp7pu.png',
// 		},
// 		timestamp: new Date(),
// 		footer: {
// 			text: 'Some footer text here',
// 			icon_url: 'https://i.imgur.com/AfFp7pu.png',
// 		},
// 	};
// 		channel.send({ embeds: [exampleEmbed] });
// }
