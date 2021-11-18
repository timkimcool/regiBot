const { REST } = require('@discordjs/rest');
const { Client, Collection, Intents } = require('discord.js');
const { Routes } = require('discord-api-types/v9');

const fs = require('fs');
const { token, clientId, guildId } = require('./config.json');
const Game = require('./game.js');

const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });
client.commands = new Collection();

// Get commands
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

// bot variables
let members = [];
let memberThreads = {};
let channel = null;
const BotPhase = {
	IDLE: 'idle',
	WAITING_FOR_JOIN: 'waiting for join',
	WAITING_FOR_PLAY: 'waiting for play',
	WAITING_FOR_DISCARD: 'waiting for discard',
  WAITING_FOR_JESTER: 'waiting for jester',
}
let currBotPhase = BotPhase.IDLE;
let gameState = null;

function resetBotState() {
  members = [];
  memberThreads = {};
  channel = null;
  // TODO: clean up channels
  currBotPhase = BotPhase.IDLE;
}

// card = {
//   value: string,
//   suit: Suit.diamond,
//   
// }

// read interactions
client.on('interactionCreate', async interaction => {
	if (!interaction.isCommand()) return;
	const command = client.commands.get(interaction.commandName);
	if (!command) return;
	try {
		console.log(interaction.commandName);
		switch (interaction.commandName) {
			case 'ping':
				channel.send.reply('Pong!');
				break;
			case 'new-game':
				if (currBotPhase !== BotPhase.IDLE) {
					await interaction.reply({ content: 'Game already in progress!', ephemeral: true });
          break;
				}
        currBotPhase = BotPhase.WAITING_FOR_JOIN;
        channel.send('New Game! Type "/join" to join the game');
        channel = interaction.channel;
				break;
			case 'join':
				if (currBotPhase !== BotPhase.WAITING_FOR_JOIN) {
					await interaction.reply({ content: 'Please start a new game first! (/new-game)', ephemeral: true });
          break;
				}
        if (members.length === 4) {
          await interaction.reply({ content: 'Maximum players reached!', ephemeral: true });
          break;
        }
        const member = interaction.member;
        if (members.find(m => m.id === member.id)) {
          await interaction.reply({ content: 'You have already joined the game.', ephemeral: true });
          break;
        }
        members.push(member);
        let currentPlayers = "Current Players: ";
        for (const member of members) {
          currentPlayers += '\n' + member.displayName;
        }
        channel.send(`${member.displayName} joined the game!`);
				break;
			case 'start':
				if (currBotPhase !== BotPhase.WAITING_FOR_JOIN) {
					await interaction.reply({ content: `Unable to start game because the BotPhase is ${currBotPhase} `, ephemeral: true });
          break;
				}
        if (members.length < 2) {
					channel.send(`Not enough players to start the game.`);
          break;
        }
        currBotPhase = BotPhase.WAITING_FOR_PLAY;
        channel.send('Start!');
        for (const member of members) {
          // create thread;
          let thread = await channel.threads.create({
            name: `${member.displayName} hand`,
            autoArchiveDuration: 60,
            reason: 'Separate thread for your hand',
          });
          memberThreads[member.id] = await thread;
          await thread.members.add(member.id);
        }
        gameState = Game.initState(members);
        channel.send(Game.stringifyState(gameState));
        for (let i = 0; i < members.length; i++) {
          let thread = memberThreads[Object.keys(memberThreads)[i]];
          thread.send(gameState.players[i].hand);
        }
				break;
			case 'play':  
        if (currBotPhase !== BotPhase.WAITING_FOR_PLAY) {
          await interaction.reply({ content: `Invalid command; the current BotPhase is ${currBotPhase} `, ephemeral: true });
          break;
				}
        const play = Game.parseCards(interaction.options.getString('cards'));
        // STEP 1: play card(s)

        if (play.length === 1 && play[0] === Game.jesterValue) {
          currBotPhase = BotPhase.WAITING_FOR_JESTER;
          gameState.isJesterPlayed = true;
          break;
        }

        if (play !== 'yield') {
          if (!Game.areValidCards(play)) {
            break;
          }
          // check if all cards are from hand
          if (Game.doCardsExistInHand(gameState, play)) { 
            break;
          }
          // more than 1 card cases
          
          if (play.length > 1) {
          // jester included?
            if(play.map(Game.stringifyCard).includes(Game.jesterValue)) {
              break;
            }
          // @TODO: check same value rule
          // @TODO: animal companion rule 
          }

          
          // STEP 2: suit power (reds)

          Game.makePlay(gameState, play);
          const activeSuits = Game.getCurrPlayerActiveSuits(gameState);
          const attackValue = Game.getCurrPlayerAttackValue(gameState);
          if (activeSuits.includes(Suits.HEART)) {
            Game.healFromDiscardPile(gameState, attackValue);
          }
          if (activeSuits.includes(Suits.Diamond)) {
            Game.dealCards(gameState, attackValue)
          }

          // STEP 3: deal damage
          const playerAttackValue = Game.getCurrPlayerAttackValue(gameState);
          gameState.royal.health -= playerAttackValue;
          if (gameState.royal.health <= 0) {
            Game.discardPlayerPlays(gameState);
            gameState.isJesterPlayed = false;
            if (gameState.royal.health === 0) {
              gameState.tavernPile.unshift(gameState.royal.activeCard);
              // msg: juggernaut was moved to tavern pile
            } else {
              gameState.discardPile.push(gameState.royal.activeCard);
            }
            gameState.royal.activeCard = null;
            gameState.royal.health = null;
            if (gameState.castleDeck.length === 0) {
              currBotPhase = BotPhase.IDLE;
              channel.send('YOU WON LOL');
            } else {
              Game.drawNewRoyal(gameState);
            }
          } else {
            // TODO: factor out as function
            // STEP 4 (START):
            currBotPhase = BotPhase.WAITING_FOR_DISCARD;
            const royalAttackValue = Game.getRoyalAttackValue(gameState);
            // check if game lose (0 hp is valid to continue)
            if (royalAttackValue > Game.getCurrPlayerHealth(gameState)) {
              channel.send(`YOU LOSE attack: ${royalAttackValue}, health: ${Game.getCurrPlayerHealth(gameState)}`);
              break;
            }
            channel.send(`Waiting for Discard, value: ${royalAttackValue}`);
          }
        } else { // yield
          if (gameState.yieldCount === gameState.players.length - 1) {
            channel.send(`Players can no longer yield consecutively.`);
            break;
          }
          gameState.yieldCount++;
          // TODO: factor out as function
          // STEP 4 (START):
          currBotPhase = BotPhase.WAITING_FOR_DISCARD;
          const royalAttackValue = Game.getRoyalAttackValue(gameState);
          // check if game lose (0 hp is valid to continue)
          if (royalAttackValue > Game.getCurrPlayerHealth(gameState)) {
            channel.send(`YOU LOSE (attack: ${royalAttackValue}, health: ${Game.getCurrPlayerHealth(gameState)})`);
            break;
          }
          channel.send(`Waiting for Discard, value: ${royalAttackValue}`);
        }
        channel.send({ content: Game.stringifyState(gameState) });
        memberThreads[gameState[currPlayerIdx]].send(gameState.players[i].hand);
				break;
      case 'jester':
        if (currBotPhase !== BotPhase.WAITING_FOR_JESTER) {
          await interaction.reply({ content: `Invalid command; the current BotPhase is ${currBotPhase} `, ephemeral: true });
          break;
        }
        const displayName = interaction.options.getString('display-name');
        if (!members.map(m => m.displayName).includes(displayName)) {
          await interaction.reply({ content: `The displayName you selected is not recognized: ${displayName}`, ephemeral: true });
          break;
        }
        gameState.currPlayerIdx = gameState.players.findIndex(player => player.displayName === displayName);
        channel.send({ content: `It is ${gameState.players[gameState.currPlayerIdx].displayName}'s turn` });
        currBotPhase = BotPhase.WAITING_FOR_PLAY;
        break;
			case 'discard':
				if (currBotPhase !== BotPhase.WAITING_FOR_DISCARD) {
					await interaction.reply({ content: `Invalid command; the current BotPhase is ${currBotPhase} `, ephemeral: true });
          break;
				}
        const discardCards = playToCards(interaction.options.getString('cards'));
        if (!Game.areValidCards(discardCards)) {
          break;
        }
        // check if all cards are from hand
        if (Game.doCardsExistInHand(gameState, discardCards)) { 
          break;
        }
        // @TODO: check if discard value value is enough
        // @TODO: check if value excessive(?)
        channel.send('Discard!');
        // STEP 4:
        Game.discard(gameState, discardCards);
        currBotPhase = BotPhase.WAITING_FOR_PLAY;
        channel.send({ content: Game.stringifyState(gameState) });
        gameState.currPlayerIdx = [gameState.currPlayerIdx + 1] % gameState.players.length;
        channel.send({ content: `It is ${gameState.players[gameState.currPlayerIdx].displayName}'s turn` });
        // @TODO: lose condition
        memberThreads[gameState[currPlayerIdx]].send(gameState.players[i].hand);
				break;
			case 'end-game':
				channel.send('End Game!');
				break;
		}
		// await command.execute(interaction);
	} catch (error) {
		console.error(error);
		await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
	}
});

function botSendMessage() {}

function botSendEmbedMessage(channel, msg) {
	const exampleEmbed = {
		color: 0x0099ff,
		title: 'Some title',
		url: 'https://discord.js.org',
		author: {
			name: 'Some name',
			icon_url: 'https://i.imgur.com/AfFp7pu.png',
			url: 'https://discord.js.org',
		},
		description: 'Some description here',
		thumbnail: {
			url: 'https://i.imgur.com/AfFp7pu.png',
		},
		fields: [
			{
				name: 'Regular field title',
				value: 'Some value here',
			},
			{
				name: '\u200b',
				value: '\u200b',
				inline: false,
			},
			{
				name: 'Inline field title',
				value: 'Some value here',
				inline: true,
			},
			{
				name: 'Inline field title',
				value: 'Some value here',
				inline: true,
			},
			{
				name: 'Inline field title',
				value: 'Some value here',
				inline: true,
			},
		],
		image: {
			url: 'https://i.imgur.com/AfFp7pu.png',
		},
		timestamp: new Date(),
		footer: {
			text: 'Some footer text here',
			icon_url: 'https://i.imgur.com/AfFp7pu.png',
		},
	};
		channel.send({ embeds: [exampleEmbed] });
}
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

client.login(token);