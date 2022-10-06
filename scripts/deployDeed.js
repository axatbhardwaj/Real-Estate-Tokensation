const { ethers, upgrades } = require('hardhat')

async function main() {
	const [deployer] = await ethers.getSigners()

	console.log(`Deploying Deed contract with the account: ${deployer.address}`)

	const Deed = await ethers.getContractFactory('Deed')
	console.log('Deploying Deed...')
	const deed = await upgrades.deployProxy(Deed,[] ,{
		initializer: 'initialize',
	})
	await deed.deployed()
	console.log('Deed deployed to:', deed.address)
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
