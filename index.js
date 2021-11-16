// Require the necessary discord.js classes
const fs = require('fs');
const { Client, Collection, Intents } = require('discord.js');
const { token, clientId, guildId } = require('./config.json');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');

// Create a new client instance
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
		// test

		// for global; updated in an hour
		// await rest.put(
		// 	Routes.applicationCommands(clientId),
		// 	{ body: commands },
		// );

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

let members = [];
let memberThreads = {};
let channel = null;
const gamePhase = {
	IDLE: 'idle',
	WAITING_FOR_JOIN: 'waiting for join',
	WAITING_FOR_PLAY: 'waiting for play',
	WAITING_FOR_DISCARD: 'waiting for discard',
}

let curPhase = gamePhase.IDLE;

// read interactions
client.on('interactionCreate', async interaction => {
	if (!interaction.isCommand()) return;

	const command = client.commands.get(interaction.commandName);

	if (!command) return;

	try {
		console.log(interaction.commandName);
		switch (interaction.commandName) {
			case 'ping':
				await interaction.reply('Pong!');
				break;
			case 'new-game':
				if (curPhase !== gamePhase.IDLE) {
					await interaction.reply({ content: 'Game already in progress!', ephemeral: true });
				} else {
					// @TODO: trigger new game
					curPhase = gamePhase.WAITING_FOR_JOIN;
					await interaction.reply('New Game! Type "/join" to join the game');
				}
				break;
			case 'join':
				if (curPhase !== gamePhase.WAITING_FOR_JOIN) {
					await interaction.reply({ content: 'Please start a new game first! (/new_game)', ephemeral: true });
				} else {
					let member = interaction.member;	// member object used to add to thread
					players.push(member);
					channel = interaction.channel;
					let currentPlayers = "Current Players: ";
					for (const member of members) {
						currentPlayers += '\n' + player.displayName;
					}
					await interaction.reply(`${member.displayName} joined the game!`);
					// @TODO: input validation
				}
				break;
			case 'start':
				if (curPhase !== gamePhase.WAITING_FOR_JOIN) {
					await interaction.reply({ content: `Unable to start game because the gamePhase is ${gamePhase} `, ephemeral: true });
				} else {
					curPhase = gamePhase.WAITING_FOR_PLAY;
					// @TODO: input validation
					await interaction.reply('Start!');
					for (const member of members) {
						// create thread;
						let thread = await channel.threads.create({
							name: `${player.displayName}'s hand`,
							autoArchiveDuration: 60,
							reason: 'Separate thread for your hand',
						});
						memberThreads[player.id] = await thread;
						await thread.members.add(player.id);
					}
				}
				break;
			case 'play':
				if (curPhase !== gamePhase.WAITING_FOR_PLAY) {
					await interaction.reply({ content: `Invalid command; the current gamePhase is ${gamePhase} `, ephemeral: true });
				} else {
					const cards = interaction.options.getString('cards');
					await interaction.reply('Play!');
				}
				break;
			case 'discard':
				if (curPhase !== gamePhase.WAITING_FOR_DISCARD) {
					await interaction.reply({ content: `Invalid command; the current gamePhase is ${gamePhase} `, ephemeral: true });
				} else {
					const cards = interaction.options.getString('cards');
					await interaction.reply('Discard!');
				}
				break;
			case 'end-game':
				await interaction.reply('End Game!');
				break;
			default:
				await interaction.reply('DEFAULT!');
		}
		// await command.execute(interaction);
	} catch (error) {
		console.error(error);
		await interaction.reply({ content: 'There was an error while executing this command!', ephemeral: true });
	}
});


function botSendMessage() {

}

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

// client.once('ready', () => {
// 	console.log('Ready!');
// 	// let thread = bot.createThread("909847488725405750", 'test2');
// 	// bot.addPlayerToThread(thread, '473249190965805068');
// 	// console.log(`Ready! Logged in as ${client.user.tag}`);
	
// 	const channel = client.channels.fetch('909847488725405750').then(channel => console.log(channel.name)).catch(console.error);;
// 	console.log(JSON.stringify(client));
// 	console.log(channel);
// 	channel.send('content');
// });

// const data = new SlashCommandBuilder()
// 	.setName('echo')
// 	.setDescription('Replies with your input!')
// 	.addStringOption(option =>
// 		option.setName('input')
// 			.setDescription('The input to echo back')
// 			.setRequired(true));


// Login to Discord with your client's token
client.login(token);