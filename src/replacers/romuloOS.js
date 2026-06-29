const { getRomuloOsProfile, writeRomuloOsSvg } = require('../utils/romuloOsProfile');

module.exports = async function () {
  const profile = await getRomuloOsProfile();
  await writeRomuloOsSvg(profile);

  return `<p align="center">
  <img src="./assets/romulo-os.svg" alt="Romulo OS — dynamic GitHub activity dashboard" width="100%" />
</p>`;
};
