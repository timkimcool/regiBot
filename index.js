// Require the necessary discord.js classes
const { Client, Intents } = require('discord.js');
const { token } = require('./config.json');

// Create a new client instance
const client = new Client({ intents: [Intents.FLAGS.GUILDS, Intents.FLAGS.GUILD_MESSAGES] });

// When the client is ready, run this code (only once)
client.once('ready', () => {
	console.log('Ready!');
});

client.on('interactionCreate', async interaction => {
	console.log('interaction received:', interaction);
	if (!interaction.isCommand()) return;

	const { commandName } = interaction;


	if (commandName === 'ping') {
		await interaction.reply('Pong!');
	} else if (commandName === 'server') {
		await interaction.reply(`Server name: ${interaction.guild.name}\nTotal members: ${interaction.guild.memberCount}`);
	} else if (commandName === 'user') {
		await interaction.reply(`Your tag: ${interaction.user.tag}\nYour id: ${interaction.user.id}`);
	}
});

const suits = {
	CLUB: "club",	// double damage > current player
	SPADE: "spade",	// shield damage > global
	HEART: "heart",	// move discard pile to deck
	DIAMOND: "diamond", // draw cards in order up to maxhandsize
}

/*
royalHealth = {
	jack: 20,
	queen: 30,
	king: 40
}

card = {
	suit: suit,
	value: number,  // 10 for juggernaut, 15 for queen, 20 for king
}

active = {
	cards: []
	health:
}
*/

client.on('messageCreate', (message) => {
	
});
/* Starting game
	/start: start game (check if game is going on)
		number of players -> size of hand
		player who want to play (/me)
		Start game command
		Bot announces who's playing
		create cards (jester count based on players)
		create draw pile
		deal cards (private message)
		create enemy pile (shuffler (top) 4J > 4Q > 4K)
		activate enemy
		choose random player
	Initialize game state
		gameState = {
			players: [],
			curPlayer: 0,
			player = {
				name: string,
				cardsInHand: [cards],
				activeCards: [[],[]],
				health: number,
			},
			enemy = {
				activeCards: [[],[]],
				health: number,
				remaining: [cards],
				attack: number
				isSuitActive: boolean,
			},
			discardPile: [cards],
			maxHandSize: ,
			yieldCount: ,
			tavernDeck: [cards]
		}
	Bot notifies random starting player
	Turn order (iterating gameState.players) // one line per move
		Bot notifies active player
		1) Play card or yield
			// Play cards: multiple cards of same value up to total value <= 10 or 1 card
			Check curPlayer
			Update gameState.activeCards
			Update gameState.cardsInHand
			Update gameState.health
			Show update board
			// Yield: yield++
		2) Activate suit
			Do we activate suit? // suit cancel
			club: double damage > current player (getDamage check for clubs)
			spade: shield damage (until enemy dies)> global (getDamage check for spades)
			heart: shuffle discard pile, count cards out, and move to bottom deck
				update gameState.discardPile
				update gameState.tavernDeck
				GUI: number of cards added
			diamond: draw cards in order up to maxhandsize
				update gameState.discardPile
				update gameState.tavernDeck
				GUI: number of cards added for each player
		3) Deal damage and check
			Calculate damage: card value, calculate spade/clubs
			Update enemy health
			Check enemy death
				if enemy dies
					gain card on top of Tavern Deck if exact kill otherwise discard pile
					remove all active cards (update gameState.activeCards)
			Check gameState.remaining = victory
			GUI: damage dealt
		4) Suffer damage
			Calculate damage: card value, calculate spade/clubs
			Update player hand
				update gameState.Player.cardsInHand
			Check player death = defeat
			GUI: damage taken
	Edge cases:
		Animal companion
		Jester

		UI
		Public channel
			Basic display
				Who's turn
				Current enemy: health and attack
				Player active cards || number of cards in hand
		"Private thread"
			Current hand
		Play syntax: /play card card (space delimited)
		Map of cards: valueSuit ex. 5D JS; W = wild/jester; AJQK; CSDH (suits)
		When suffering damage = /discard syntax
	*/
// Login to Discord with your client's token
client.login(token);