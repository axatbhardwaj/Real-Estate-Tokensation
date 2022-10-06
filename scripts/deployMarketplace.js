const { ethers, upgrades } = require('hardhat');

const FEE_DATA = {
  maxFeePerGas: ethers.utils.parseUnits('100', 'gwei'),
  maxPriorityFeePerGas: ethers.utils.parseUnits('5', 'gwei'),
};

async function main() {
  const [deployer] = await ethers.getSigners();

  console.log(
    `Deploying marketplace contract with the account: ${deployer.address}`
  );

  const Marketplace = await ethers.getContractFactory('marketplace');
  console.log('Deploying marketplace...');
  const marketplace = await upgrades.deployProxy(Marketplace, [], {
    initializer: 'initialize',
  });
  await marketplace.deployed();
  console.log('marketplace deployed to:', marketplace.address);
}
// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
