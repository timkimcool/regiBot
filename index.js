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

client.on('messageCreate', (message) => {
});

// Login to Discord with your client's token
client.login(token);

const suits = [ 'C', 'S', 'H', 'D'];

const playerValues = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10'];

const royalValues = ['J', 'Q', 'K'];

const jesterValue = 'W';

const attackValueMap = {
  A: 1, 2: 2, 3: 3, 4: 4, 5: 5,
  6: 6, 7: 7, 8: 8, 9: 9, 10: 10,
  J: 10, Q: 15, K: 20, W: 0,
};

const royalHealthMap = { J: 20, Q: 30, K: 40 };

// player = {
//   username: string,
//   id: string,
//   hand: [cards],
//   plays: [[],[]],
// }

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

function addPlayer(state, { username, id }) {
  state.players.push({
    username,
    id, 
    hand: [],
    plays: [],
  });
}

function setMetaStates(state) {
  switch (state.players.length) {
    case 2:
      state.maxHandSize = 7;
      state.numJesters = 0;
      break;
    case 3:
      state.maxHandSize = 6;
      state.numJesters = 1;
      break;
    case 4:
      state.maxHandSize = 5;
      state.numJesters = 2;
      break;
  }
}

function getPlayerCards(state) {
  const cards = [];
  for (let value of playerValues) {
    for (let suit of suits) {
      cards.push({ value, suit });
    }
  }
  for (let i = 0; i < state.numJesters; i++) {
    cards.push({ value: jesterValue, suit: null });
  }
  return cards;
}

function getRoyalCards() {
  const cards = [];
  for (let value of royalValues) {
    for (let suit of suits) {
      cards.push({ value, suit });
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
  const hasClub = getCurrPlayerActiveSuits(state).includes('C');
  return hasClub ? (attackValue * 2) : attackValue;
}

function getCurrPlayerActiveSuits(state) {
  const player = state.players[state.currPlayerIdx];
  const latestPlay = player.plays[player.plays.length - 1];
  const suits = latestPlay.map(card => card.suit);
  return state.isJesterPlayed
    ? suits
    : suits.filter(card => card !== state.royal.activeCard.suit);
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
  }
}

function getRoyalAttackValue(state) {
  if (state.isJesterPlayed) return state.royal.attackValue;
  const shieldValue = getAllCardsInPlay(state).reduce((sum, card) => (
    sum + (card.suit === 'S' ? card.value : 0)
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

const users = [
  { username: 'romebop', id: '009' },
  { username: 'timkimcool', id: '9000' },
  { username: 'titus', id: '007' },
  { username: 'josh', id: '1' }
];

function initGameState(users) {
  
  let state = getNewState();

  users.forEach(user => addPlayer(state, user));
  
  setMetaStates(state);
  
  initDecks(state);
  
  dealCards(state);

  drawNewRoyal(state);

  return state;

}

let state = initGameState(users);

let isGameOver = false;
while (!isGameOver) {
  const player = state.players[state.currPlayerIdx];
  // BOT MSG: it's [player]'s turn.
  // RECEIVE: [play]
  const play = 'reply'; // [ ...cards]

  // step 1: play card(s)
  if (play !== yield) {

    // check if all cards are from hand:
    // (arr, target) => target.every(v => arr.includes(v));
    // check if multiple cards condition is met (animal companion and triples)
    // step 2: suit power (reds)

    const playCards = 'reply';
    makePlay(state, playCards);
    
    const activeSuits = getCurrPlayerActiveSuits(state);
    const attackValue = getCurrPlayerAttackValue(state);

    if (activeSuits.includes('H')) {
      healFromDiscardPile(state, attackValue);
    }

    if (activeSuits.includes('D')) {
      dealCards(state, attackValue)
    }


    // check if jester

    // step 3: deal damage
    const playerAttackValue = getCurrPlayerAttackValue(state);
    state.royal.health -= playerAttackValue;
    if (state.royal.health <= 0) {
      discardPlayerPlays(state);
      if (state.royal.health === 0) {
        state.tavernPile.unshift(state.royal.activeCard);
      } else {
        state.discardPile.push(state.royal.activeCard);
      }
      state.royal.activeCard = null;
      state.royal.health = null;
      if (state.castleDeck.length === 0) {
        isGameOver = true;
      } else {
        drawNewRoyal(state);
      }
      continue;
    }
  } else { // yield

  }

  // step 4: receive damage
  const royalAttackValue = getRoyalAttackValue(state);
  const discardCards = 'reply' // [ ...cards]
  discard(state, discardCards);


  state.currPlayerIdx = [state.currPlayerIdx + 1] % state.players.length;
}

// visual helpers:

function stringifyCard(card) {
  return card.value + (card.suit ? `|${card.suit}` : '');
}

function showHands(state) {
  state.players.forEach(player => {
    console.log(`${player.username}:`, player.hand.map(stringifyCard));
  });
}

// TODOS:
// do step logic
// cover edge cases
// factor out hard codes
// clean up enums
// handle error cases
// identify bot interaction spots 

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
      username: string,
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