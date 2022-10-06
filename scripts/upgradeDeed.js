async function main() {
	const proxyAddress = '0x00a0BAE23015C473f70592E0E97F227B082a90c4'
	const Deed = await ethers.getContractFactory('Deed_V3')
	console.log('Preparing upgrade...')
	const DeedAddress = await upgrades.upgradeProxy(
		proxyAddress,
		Deed
	)
	console.log('Deed_v3 at:', DeedAddress.address);
}

main()
	.then(() => process.exit(0))
	.catch((error) => {
		console.error(error)
		process.exit(1)
	})