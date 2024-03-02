const { getColorBrightness } = require("./utils/getColorBrightness");

const black = '#121111';
const white = '#F2F2F2';

function generateBaseAndOverColor(color) {
  const brightnessThreshold = 0.69;

  return {
    base: color,
    over: getColorBrightness(color) <= brightnessThreshold ? white : black,
  }
}

module.exports = {
  colors: {
    primary: generateBaseAndOverColor('#005b96'),
    secondary: generateBaseAndOverColor('#b6764d'),
    lightSecondary: generateBaseAndOverColor('#b3cee0'),
    black: generateBaseAndOverColor(black),
    white: generateBaseAndOverColor(white),
  },
};
