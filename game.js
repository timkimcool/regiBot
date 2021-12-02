// game variables
const Suit = {
  CLUB: 'C',
  SPADE: 'S',
  HEART: 'H',
  DIAMOND: 'D',
};
const symbolMap =  {
  C: '♧',
  S: '♤',
  H: '♡',
  D: '♢',
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

function getCurrPlayerHand(state) {
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
  if (
    state.royal.activeCard.suit === Suit.CLUB
    && !state.isJesterPlayed
  ) {
    return attackValue;
  }
  const hasClub = getCurrPlayerActiveSuits(state).includes(Suit.CLUB);
  return hasClub ? (attackValue * 2) : attackValue;
}

function getCurrPlayerActiveSuits(state) {
  const player = state.players[state.currPlayerIdx];
  const latestPlay = player.plays[player.plays.length - 1];
  const suits = latestPlay.map(card => card.suit)
    .filter(suit => suit !== null);
  return state.isJesterPlayed
    ? suits
    : suits.filter(suit => suit !== state.royal.activeCard.suit);
}

function discardPlayerPlays(state) {
  state.discardPile.push(...getAllCardsInPlay(state));
  state.players.forEach(player => player.plays = []);
}

function makePlay(state, cards) {
  const player = state.players[state.currPlayerIdx];
  player.plays.push(cards);
  cards.map(stringifyCard).forEach(cardStr => {
    const idx = player.hand.findIndex(card => stringifyCard(card) === cardStr);
    player.hand.splice(idx, 1);
  });
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
  if (
    state.royal.activeCard.suit === Suit.SPADE
    && !state.isJesterPlayed
  ) {
    return rawValue;
  }
  const shieldValue = getAllPlays(state).reduce((sum, play) => {
    const hasSpade = play.map(c => c.suit).includes(Suit.SPADE);
    return sum + (hasSpade
      ? play.map(c => attackValueMap[c.value]).reduce((a, c) => a + c, 0)
      : 0);
  }, 0)
  const updatedValue = rawValue - shieldValue;
  return updatedValue < 0 ? 0 : updatedValue;
}

function getAllPlays(state) {
  const plays = [];
  for (const player of state.players) {
    for (const play of player.plays) {
      plays.push(play);
    }
  }
  return plays;
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
  input.split(' ').forEach(rawCard => {
    rawCard = rawCard.toUpperCase();
    if (rawCard === jesterValue) {
      cards.push({ value: jesterValue, suit: null });
    } else {
      cards.push({ value: rawCard.slice(0, -1), suit: rawCard.slice(-1) });
    }
  })
  return cards;
}

function isValidInput(input) {
  if (input === null) return false;
  if ([jesterValue, 'yield'].includes(input)) return true;
  let rawCards = input.split(' ');
  return rawCards.reduce((acc, rawCard) => {
    const value = rawCard.slice(0, -1);
    const suit = rawCard.slice(-1);
    return acc
      && (
        (playerValues.includes(value) || royalValues.includes(value))
        && (Object.values(Suit).includes(suit))
      );
  }, true);
}

function isValidPlay(cards) {
  const cardValues = cards.map(card => card.value);
  if (cardValues.includes(jesterValue)) {
    return cards.length === 1;
  }
  if (cards.length > 1) {
    if (cardValues.includes('A')) {
      return cards.length === 2;
    }
    return cardValues.every((val, _, vals) => val === vals[0])
      && (cardValues.reduce((sum, val) => sum + attackValueMap[val], 0) <= 10);
  }
  return true;
}

function doCardsExistInHand(gameState, cards) {
  const hand = getCurrPlayerHand(gameState).map(stringifyCard);
  return cards.reduce((acc, card) => (
    acc && hand.includes(stringifyCard(card))
  ), true);
}

function getCurrPlayerName(gameState) {
  return gameState.players[gameState.currPlayerIdx].displayName;
}

// print helpers:

function stringifyCard(card) {
  // if (card.value === jesterValue) return '🃏';
  return card.value + (card.suit ? `${symbolMap[card.suit]}` : '');
}

function stringifyState(state) {
  const deckStr = `[Discard Pile: ${state.discardPile.length}]`
    + ` [Castle Deck: ${state.castleDeck.length}]`
    + ` [Tavern Deck: ${state.tavernDeck.length}]`;
  const royalStr = `\n\nRoyal Card: ${stringifyCard(state.royal.activeCard)}`
    + `\nRoyal Attack: ${getRoyalAttackValue(state)}`
    + `\nRoyal Health: ${state.royal.health}`;
  let playersStr = '';
  for (let i = 0; i < state.players.length; i++) {
    const player = state.players[i];
    const plays = player.plays;
    const playsStr = plays.slice(0, -1).map(play => `[${play.map(stringifyCard).join(', ')}]`).join(' ')
      + (plays.length ? ` ${plays[plays.length - 1].map(stringifyCard).join(', ')}` : '');
    const turnStr = i === state.currPlayerIdx ? '🗹' : '☐';
    const playerStr = `\n\n${turnStr} ${player.displayName}`
      + `\ncards in play: ${playsStr === '' ? '(none)' : playsStr}`
      + `\ncards in hand: ${player.hand.length}`;
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
  Suit,
  jesterValue,
  attackValueMap,
  getCurrPlayerHand,
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
  isValidInput,
  isValidPlay,
  doCardsExistInHand,
  getCurrPlayerName,
  stringifyCard,
  stringifyState,
}