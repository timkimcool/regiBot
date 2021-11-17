const fs = require('fs');
const { Client, Collection, Intents } = require('discord.js');
const { token, clientId, guildId } = require('./config.json');
const { SlashCommandBuilder } = require('@discordjs/builders');
const { REST } = require('@discordjs/rest');
const { Routes } = require('discord-api-types/v9');
const { stringify } = require('querystring');

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
const GamePhase = {
	IDLE: 'idle',
	WAITING_FOR_JOIN: 'waiting for join',
	WAITING_FOR_PLAY: 'waiting for play',
	WAITING_FOR_DISCARD: 'waiting for discard',
  WAITING_FOR_JESTER: 'waiting for jester',
}
let curPhase = GamePhase.IDLE;

function resetBotState() {
  members = [];
  memberThreads = {};
  channel = null;
  // TODO: clean up channels
  curPhase = GamePhase.IDLE;
}

// game variables
const Suit = {
  CLUB: 'C',
  SPADE: 'S',
  HEART: 'H',
  DIAMOND: 'D',
};
const playerValues = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
const royalValues = ['J', 'Q', 'K'];
const jesterValue = 'W';
const attackValueMap = {
  A: 1, 2: 2, 3: 3, 4: 4, 5: 5,
  6: 6, 7: 7, 8: 8, 9: 9, 10: 10,
  J: 10, Q: 15, K: 20, W: 0,
};
const royalHealthMap = { J: 20, Q: 30, K: 40 };
let state = null;

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
				await interaction.reply('Pong!');
				break;
			case 'new-game':
				if (curPhase !== GamePhase.IDLE) {
					await interaction.reply({ content: 'Game already in progress!', ephemeral: true });
          break;
				}
        curPhase = GamePhase.WAITING_FOR_JOIN;
        await interaction.reply('New Game! Type "/join" to join the game');
				break;
			case 'join':
				if (curPhase !== GamePhase.WAITING_FOR_JOIN) {
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
        channel = interaction.channel;
        let currentPlayers = "Current Players: ";
        for (const member of members) {
          currentPlayers += '\n' + member.displayName;
        }
        await interaction.reply(`${member.displayName} joined the game!`);
				break;
			case 'start':
				if (curPhase !== GamePhase.WAITING_FOR_JOIN) {
					await interaction.reply({ content: `Unable to start game because the GamePhase is ${curPhase} `, ephemeral: true });
          break;
				}
        if (members.length < 2) {
					await interaction.reply({ content: `Not enough players to start the game.`});
          break;
        }
        curPhase = GamePhase.WAITING_FOR_PLAY;
        await interaction.reply('Start!');
        for (const member of members) {
          // create thread;
          let thread = await channel.threads.create({
            name: `${member.displayName}'s hand`,
            autoArchiveDuration: 60,
            reason: 'Separate thread for your hand',
          });
          memberThreads[member.id] = await thread;
          await thread.members.add(member.id);
        }
        state = initGameState(members);
        await interaction.reply({ content: stringifyState(state) });
				break;
			case 'play':
        if (curPhase !== GamePhase.WAITING_FOR_PLAY) {
          await interaction.reply({ content: `Invalid command; the current GamePhase is ${curPhase} `, ephemeral: true });
          break;
				}
        const play = playToCards(interaction.options.getString('cards'));
        // STEP 1: play card(s)

        if (play.length === 1 && play[0] === jesterValue) {
          curPhase = GamePhase.WAITING_FOR_JESTER;
          state.isJesterPlayed = true;
          break;
        }

        if (play !== 'yield') {
          if (!isValidCards(play)) {
            break;
          }
          // check if all cards are from hand
          if (doCardsExistInHand(state, play)) { 
            break;
          }
          // more than 1 card cases
          
          if (play.length > 1) {
          // jester included?
            if(play.map(stringifyCard).includes(jesterValue)) {
              break;
            }
          // @TODO: check same value rule
          // @TODO: animal companion rule 
          }

          
          // STEP 2: suit power (reds)

          makePlay(state, play);
          const activeSuits = getCurrPlayerActiveSuits(state);
          const attackValue = getCurrPlayerAttackValue(state);
          if (activeSuits.includes(Suits.HEART)) {
            healFromDiscardPile(state, attackValue);
          }
          if (activeSuits.includes(Suits.Diamond)) {
            dealCards(state, attackValue)
          }

          // STEP 3: deal damage
          const playerAttackValue = getCurrPlayerAttackValue(state);
          state.royal.health -= playerAttackValue;
          if (state.royal.health <= 0) {
            discardPlayerPlays(state);
            state.isJesterPlayed = false;
            if (state.royal.health === 0) {
              state.tavernPile.unshift(state.royal.activeCard);
              // msg: juggernaut was moved to tavern pile
            } else {
              state.discardPile.push(state.royal.activeCard);
            }
            state.royal.activeCard = null;
            state.royal.health = null;
            if (state.castleDeck.length === 0) {
              curPhase = GamePhase.IDLE;
              await interaction.reply('YOU WON LOL');
            } else {
              drawNewRoyal(state);
            }
          } else {
            // TODO: factor out as function
            // STEP 4 (START):
            curPhase = GamePhase.WAITING_FOR_DISCARD;
            const royalAttackValue = getRoyalAttackValue(state);
            // check if game lose (0 hp is valid to continue)
            if (royalAttackValue > getCurrPlayerHealth(state)) {
              await interaction.reply(`YOU LOSE attack: ${royalAttackValue}, health: ${getCurrPlayerHealth(state)}`);
              break;
            }
            await interaction.reply(`Waiting for Discard, value: ${royalAttackValue}`);
          }
        } else { // yield
          if (state.yieldCount === state.players.length - 1) {
            await interaction.reply(`Players can no longer yield consecutively.`);
            break;
          }
          state.yieldCount++;
          // TODO: factor out as function
          // STEP 4 (START):
          curPhase = GamePhase.WAITING_FOR_DISCARD;
          const royalAttackValue = getRoyalAttackValue(state);
          // check if game lose (0 hp is valid to continue)
          if (royalAttackValue > getCurrPlayerHealth(state)) {
            await interaction.reply(`YOU LOSE attack: ${royalAttackValue}, health: ${getCurrPlayerHealth(state)}`);
            break;
          }
          await interaction.reply(`Waiting for Discard, value: ${royalAttackValue}`);
        }
        await interaction.reply({ content: stringifyState(state) });
				break;
      case 'jester':
        if (curPhase !== GamePhase.WAITING_FOR_JESTER) {
          await interaction.reply({ content: `Invalid command; the current GamePhase is ${curPhase} `, ephemeral: true });
          break;
        }
        const displayName = interaction.options.getString('displayName');
        if (!members.map(m => m.displayName).includes(displayName)) {
          await interaction.reply({ content: `The displayName you selected is not recognized: ${displayName}`, ephemeral: true });
          break;
        }
        state.currPlayerIdx = state.players.findIndex(player => player.displayName === displayName);
        await interaction.reply({ content: `It is ${state.players[state.currPlayerIdx].displayName}'s turn` });
        curPhase = GamePhase.WAITING_FOR_PLAY;
        break;
			case 'discard':
				if (curPhase !== GamePhase.WAITING_FOR_DISCARD) {
					await interaction.reply({ content: `Invalid command; the current GamePhase is ${curPhase} `, ephemeral: true });
          break;
				}
        const discardCards = interaction.options.getString('cards');
        if (!isValidCards(discardCards)) {
          break;
        }
        const discardCards = playToCards(discardCards);
        // check if all cards are from hand
        if (doCardsExistInHand(state, discardCards)) { 
          break;
        }
        // @TODO: check if discard value value is enough
        // @TODO: check if value excessive(?)
        await interaction.reply('Discard!');
        // STEP 4:
        discard(state, discardCards);
        await interaction.reply({ content: stringifyState(state) });
        state.currPlayerIdx = [state.currPlayerIdx + 1] % state.players.length;
        await interaction.reply({ content: `It is ${state.players[state.currPlayerIdx].displayName}'s turn` });
        curPhase = GamePhase.WAITING_FOR_PLAY;
				break;
			case 'end-game':
				await interaction.reply('End Game!');
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

function getNewState() {
  return {
    // meta:
    maxHandSize: null,
    numJesters: null,
    // battle:
    players: [],
    royal: {
      activeCard: null,
      health: null,
    },
    // decks:
    discardPile: [],
    castleDeck: [],
    tavernDeck: [],
    // misc:
    currPlayerIdx: 0,
    yieldCount: 0,
    isJesterPlayed: false,
  }
}

function getCurrentPlayerHand(state) {
  return state.players[currPlayerIdx].hand;
}

function addPlayer(state, { displayName, id }) {
  state.players.push({
    displayName,
    id, 
    hand: [],
    plays: [],
  });
}

function setMetaStates(state) {
  state.maxHandSize = 9 - state.players.length;
  state.numJesters = state.players.length - 2;
}

function getPlayerCards(state) {
  const cards = [];
  for (const value of playerValues) {
    for (const key in Suit) {
      cards.push({ value, suit: Suit[key] });
    }
  }
  for (let i = 0; i < state.numJesters; i++) {
    cards.push({ value: jesterValue, suit: null });
  }
  return cards;
}

function getRoyalCards() {
  const cards = [];
  for (const value of royalValues) {
    for (const key in Suit) {
      cards.push({ value, suit: Suit[key] });
    }
  }
  return cards;
}

// fisher-yates shuffle
function shuffleCards(cards) {
  let currIdx = cards.length;
  let randomIdx;
  while (currIdx !== 0) {
    randomIdx = Math.floor(Math.random() * currIdx);
    currIdx--;
    [cards[currIdx], cards[randomIdx]] = [cards[randomIdx], cards[currIdx]];
  }
  return cards;
}

function dealCards(state, numCards = Number.POSITIVE_INFINITY) {
  let dealIdx = state.currPlayerIdx;
  while (
    numCards > 0
    && !doesEveryoneHaveMaxHand(state)
    && state.tavernDeck.length > 0
  ) {
    const player = state.players[dealIdx];
    if (player.hand.length < state.maxHandSize) {
      const card = state.tavernDeck.shift();
      player.hand.push(card);
      numCards--;
    }
    dealIdx = (dealIdx + 1) % getNumPlayers(state);
  }
}

function doesEveryoneHaveMaxHand(state) {
  return state.players.reduce((acc, player) => (
    acc && (player.hand.length === state.maxHandSize)
  ), true);
}

function initDecks(state) {
  state.tavernDeck = shuffleCards(getPlayerCards(state));
  const royalCards = getRoyalCards();
  state.castleDeck = [
    ...shuffleCards(royalCards.filter(c => c.value === royalValues[0])),
    ...shuffleCards(royalCards.filter(c => c.value === royalValues[1])),
    ...shuffleCards(royalCards.filter(c => c.value === royalValues[2])),
  ];
}

function drawNewRoyal(state) {
  const royalCard = state.castleDeck.shift();
  state.royal.activeCard = royalCard;
  state.royal.health = royalHealthMap[royalCard.value];
}

function getCurrPlayerHealth(state) {
  const player = state.players[state.currPlayerIdx];
  return player.hand.reduce((sum, card) => (
    sum + attackValueMap[card.value]
  ), 0);
}

function getCurrPlayerAttackValue(state) {
  const player = state.players[state.currPlayerIdx];
  const latestPlay = player.plays[player.plays.length - 1];
  const attackValue = latestPlay.reduce((sum, card) => (
    sum + attackValueMap[card.value]
  ), 0);
  const hasClub = getCurrPlayerActiveSuits(state).includes(Suit.CLUB);
  return hasClub ? (attackValue * 2) : attackValue;
}

function getCurrPlayerActiveSuits(state) {
  const player = state.players[state.currPlayerIdx];
  const latestPlay = player.plays[player.plays.length - 1];
  const suits = latestPlay.map(card => card.suit);
  return state.isJesterPlayed
    ? suits
    : suits.filter(card => card.suit !== state.royal.activeCard.suit);
}

function discardPlayerPlays(state) {
  state.discardPile.push(...getAllCardsInPlay(state));
  state.players.forEach(player => player.plays = []);
}

function makePlay(state, cards) {
  const player = state.players[state.currPlayerIdx];
  player.plays.push(cards);
}

function healFromDiscardPile(state, numCards) {
  shuffleCards(state.discardPile);
  while (numCards > 0 && state.discardPile.length > 0) {
    const card = state.discardPile.pop();
    state.tavernDeck.push(card);
    numCards--;
  }
}

function getRoyalAttackValue(state) {
  if (state.isJesterPlayed) return state.royal.attackValue;
  const shieldValue = getAllCardsInPlay(state).reduce((sum, card) => (
    sum + (card.suit === Suit.SPADE ? card.value : 0)
  ), 0)
  const royalAttackValue = state.royal.attackValue - shieldValue;
  return royalAttackValue < 0 ? 0 : royalAttackValue;
}

function getAllCardsInPlay(state) {
  const cards = [];
  for (const player of state.players) {
    for (const play of player.plays) {
      for (const card of play) {
        cards.push(card);
      }
    }
  }
  return cards;
}

function discard(state, cards) {
  const player = state.players[state.currPlayerIdx];
  for (const card of cards) {
    const idx = player.hand.findIndex(c =>
      (c.value === card.value) && (c.suit === card.suit) 
    );
    state.discardPile.push(card);
    player.hand.splice(idx, 1);
  }
}

function initGameState(members) {
  let state = getNewState();
  members.forEach(member => addPlayer(state, member));
  state = setMetaStates(state);
  initDecks(state);
  dealCards(state);
  drawNewRoyal(state);
  return state;
}

function getCardValues(cards) {
  return cards.reduce((sum, card) => sum + card.value, 0);
}

function playToCards(input) {
  const cards = [];
  input.split(' ').forEach(c => {
    c = c.toUpperCase();
    if (c === jesterValue) {
      cards.push({ value: jesterValue, suit: null});
    } else {
      cards.push({ value: c.slice(0, -1), suit: Suit[c.slice(-1)] });
    }
  })
  return cards;
}

function isValidCards(input) {
  if (input === jesterValue) {
    return true;
  }
  let cards = input.toUpperCase().split(' ');
  return cards.reduce((acc, card) => {
    let suit = card.slice(-1);
    let value = card.slice(0, -1);
    return acc && (
      (playerValues.includes(value) || royalValues.includes(value)) &&
      (Object.values(Suit).includes(suit))
    );
  });
}

// print helpers:

function stringifyCard(card) {
  return card.value + (card.suit ? `|${card.suit}` : '');
}

function showHands(state) {
  state.players.forEach(player => {
    console.log(`${player.displayName}:`, player.hand.map(stringifyCard));
  });
}

function doCardsExistInHand(state, cards) {
  const hand = getCurrentPlayerHand(state);
  const handMap = {};
  for (const card of hand) {
    handMap[stringifyCard(card)] = 1;
  }
  return cards.reduce((acc, card) => 
    acc && handMap.hasOwnProperty(stringifyCard(card))
    , true);

function stringifyState(state) {
  const deckStr = `Discard Pile count: ${state.discardPile.length}`
    + `\nCastle Deck count: ${state.castleDeck.length}`;
    + `\nTavern Deck count: ${state.teavernDeck.length}`;
  const royalStr = `\nRoyal Card: ${stringifyCard(state.royal.activeCard)}`
    + `\nRoyal Attack: ${getRoyalAttackValue(state)}`
    + `\nRoyal Health: ${state.royal.health}`;
  let playersStr = '';
  for (const player of state.players) {
    const strPlays = player.plays.map(play => play.map(stringifyCard));
    const playerStr = `\n${player.displayName} has ${player.hand.length} cards in hand.`
      + `\nCards in play: ${strPlays}`;
    playersStr += playerStr;
  }
  return deckStr + royalStr + playersStr;
}

// TODOS:
// implement yield and jester logic
// handle input validations
// { command, snapshot } history

/*
Starting game
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
    player = {
      displayName: string,
      id: string,
      cardsInHand: [cards],
      activeCards: [[],[]],
      health: number,
    },
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
