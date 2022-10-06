const { ethers, upgrades } = require('hardhat')
async function main() {
	const [deployer] = await ethers.getSigners()
  let whitelistAdminAddress = "0xBDbDEd617bf9b1d500823D083A2e33dC53e42d11" // set whitelist owner address here
	console.log(`Deploying ICO contract with the account: ${deployer.address}`)
  
	const ICO = await ethers.getContractFactory('ICO')
	console.log('Deploying ICO...')
  const ico = await upgrades.deployProxy(ICO, [
  whitelistAdminAddress,
  "0x651dF973D62d501621Ca2076a1823f083B06F5d1",
  "0x2B486C87bB613922a7B6F250B11616a823C1835F"],  
  { initializer: 'Initialize' });
	await ico.deployed()
	console.log('ICO deployed to:', ico.address)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

