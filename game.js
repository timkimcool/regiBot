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
  return state.players[state.currPlayerIdx].hand;
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
    dealIdx = (dealIdx + 1) % state.players.length;
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
  const rawValue = attackValueMap[state.royal.activeCard.value];
  if (state.isJesterPlayed) return rawValue;
  const shieldValue = getAllCardsInPlay(state).reduce((sum, card) => (
    sum + (card.suit === Suit.SPADE ? card.value : 0)
  ), 0)
  const updatedValue = rawValue - shieldValue;
  return updatedValue < 0 ? 0 : updatedValue;
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

function initState(members) {
  let state = getNewState();
  members.forEach(member => addPlayer(state, member));
  setMetaStates(state);
  initDecks(state);
  dealCards(state);
  drawNewRoyal(state);
  return state;
}

function getCardValues(cards) {
  return cards.reduce((sum, card) => sum + card.value, 0);
}

function parseCards(input) {
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

function areValidCards(input) {
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

function doCardsExistInHand(gameState, cards) {
  const hand = getCurrentPlayerHand(gameState);
  const handMap = {};
  for (const card of hand) {
    handMap[stringifyCard(card)] = 1;
  }
  return cards.reduce((acc, card) => (
    acc && handMap.hasOwnProperty(stringifyCard(card))
  ), true);
}

// print helpers:

function stringifyCard(card) {
  return card.value + (card.suit ? `|${card.suit}` : '');
}

function stringifyState(state) {
  const deckStr = `Discard Pile count: ${state.discardPile.length}`
    + `\nCastle Deck count: ${state.castleDeck.length}`;
    + `\nTavern Deck count: ${state.teavernDeck.length}`;
  const royalStr = `\nRoyal Card: ${stringifyCard(state.royal.activeCard)}`
    + `\nRoyal Attack: ${getRoyalAttackValue(state)}`
    + `\nRoyal Health: ${state.royal.health}`;
  let playersStr = '';
  for (const player of state.players) {
    const strPlays = player.plays.map(play => play.map(stringifyCard)).join(' ');
    const playerStr = `\n${player.displayName} has ${player.hand.length} cards in hand.`
      + `\nCards in play: ${strPlays === '' ? 'None' : strPlays}`;
    playersStr += playerStr;
  }
  return deckStr + royalStr + playersStr;
}

function showHands(state) {
  state.players.forEach(player => {
    console.log(`${player.displayName}:`, player.hand.map(stringifyCard));
  });
}

module.exports = {
  jesterValue,
  addPlayer,
  dealCards,
  drawNewRoyal,
  getCurrPlayerHealth,
  getCurrPlayerAttackValue,
  getCurrPlayerActiveSuits,
  discardPlayerPlays,
  makePlay,
  healFromDiscardPile,
  getRoyalAttackValue,
  discard,
  initState,
  parseCards,
  areValidCards,
  doCardsExistInHand,
  stringifyCard,
  stringifyState,
}