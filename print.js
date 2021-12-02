const cardPrintMap = {
  A: ` _____ 
|A    |
|     |
|  o  |
|     |
|____A|
`,
  2: ` _____ 
|2    |
|  o  |
|     |
|  o  |
|____2|
`,
  3: ` _____ 
|3    |
| o o |
|     |
|  o  |
|____3|
`,
  4: ` _____ 
|4    |
| o o |
|     |
| o o |
|____4|
`,
  5: ` _____ 
|5    |
| o o |
|  o  |
| o o |
|____5|
`,
  6: ` _____ 
|6    |
| o o |
| o o |
| o o |
|____6|
`,
  7: ` _____ 
|7    |
| o o |
|o o o|
| o o |
|____7|
`,
  8: ` _____ 
|8    |
|o o o|
| o o |
|o o o|
|____8|
`,
  9: ` _____ 
|9    |
|o o o|
|o o o|
|o o o|
|____9|
`,
  10: ` _____ 
|10 o |
|o o o|
|o o o|
|o o o|
|___10|
`,
  J: ` _____ 
|J  ww|
| ^ {)|
|(o)% |
| | % |
|__%_J|
`,
  Q: ` _____ 
|Q  ww|
| ^ {(|
|(o)%%|
| |%%%|
|_%%_Q|
`,
  K: ` _____ 
|K  WW|
| ^ {)|
|(o)%%|
| |%%%|
|_%%_K|
`,
  W: ` _____ 
|W    |
|     |
|( '0'|
|uwu  |
|____W|
`,
};

function getCardPrint(card) {
  return cardPrintMap[card.value].replace(/o/g, suitSymbolMap[card.suit]);
}

function getCardsPrint(cards) {
  const space = '  ';
  let print = '\n\n\n\n\n\n';
  for (const card of cards) {
    const printLines = print.split('\n');
    const cardLines = getCardPrint(card).split('\n');
    for (let i = 0; i < printLines.length; i++) {
      printLines[i] += (space + cardLines[i]);
    }
    print = printLines.join('\n');
  }
  return print;
}

module.exports = {
  getCardPrint,
  getCardsPrint,
}