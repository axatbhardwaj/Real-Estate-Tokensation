const { ethers, upgrades } = require('hardhat')

async function main() {
	const [deployer] = await ethers.getSigners()

	console.log(`Deploying EstateToken contract with the account: ${deployer.address}`)
  
	const EstateToken = await ethers.getContractFactory('EstateToken')
	console.log('Deploying EstateToken...')
	const estatetoken = await upgrades.deployProxy(EstateToken ,{
		initializer: 'initialize',
	})
	await estatetoken.deployed()
	console.log('EstateToken deployed to:', estatetoken.address)
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});