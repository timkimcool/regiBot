let play1 = "10h 4d AS";
let play2 = "3h 4d 5r";
let play3 = 'w';
let currPlayerHand = "10h 4h AS 2S";
// console.log(play1[0]);
// console.log(play1.split(' ')[0].slice(-1));

const Suit = {
  CLUB: 'C',
  SPADE: 'S',
  HEART: 'H',
  DIAMOND: 'D',
};
const playerValues = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
const royalValues = ['J', 'Q', 'K'];

function isValidCards(input) {
  if (input === 'W') {
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

function doCardsExistInHand(cards) {
  const hand = parsePlay(currPlayerHand);
  const handMap = {};
  for (const card of hand) {
    handMap[stringifyCard(card)] = 1;
  }
  return cards.reduce((acc, card) => 
    acc && handMap.hasOwnProperty(stringifyCard(card))
    , true);
}

function parsePlay(input) {
  console.log(input);
  const cards = [];
  input.split(' ').forEach(c => {
    c = c.toUpperCase();
    cards.push({ value: c.slice(0, -1), suit: c.slice(-1) });
  })
  return cards;
}

function stringifyCard(card) {
  return card.value + (card.suit ? `|${card.suit}` : '');
}
c = 'W'
console.log({ value: c.slice(0, -1), suit: Suit[c.slice(-1)] });
// console.log(isValidCards(play2));
// console.log(isValidCards(play3));