// const { expect } = require('chai');
// const { ethers } = require('hardhat');
// const hre = require('hardhat');
// var Web3 = require('web3');
// var web3 = new Web3();
// require('dotenv').config();

// describe('Marketplace Test', function () {
//   let EstateTokenContract;
//   let deployer;
//   let SecondAccount;
//   let thirdAccount;
//   let vestingContractAddress;
//   let crowdsaleContractAddress;
//   let vestingTokenAmount;
//   let crowdsaleTokenAmount;
//   const uri = 'Uri ';
//   const nullAddress = '0x0000000000000000000000000000000000000000';
//   let DeedContract;
//   let ERC20TokenContract;
//   let MarketplaceContract;
//   let ERC20Account;
//   let MogulPayout;
//   let propertyOwner;
//   let maxSupply = 200000;
//   let legaldoc = 'This is legal doc';
//   let propertydoc = 'This is property doc';
//   let propertyPrice = 200000;
//   let propertyOwnerRetains = 1000;
//   let platformFees = 100000;
//   let amount2 = 10000000000;

//   beforeEach(async () => {
//     [
//       deployer,
//       SecondAccount,
//       thirdAccount,
//       crowdsaleContractAddress,
//       vestingContractAddress,
//       ERC20Account,
//       MogulPayout,
//       propertyOwner,
//     ] = await ethers.getSigners();
//     const Deed = await ethers.getContractFactory('Deed');
//     DeedContract = await upgrades.deployProxy(Deed);
//     DeedContract = await DeedContract.deployed();
//     const ERC20Token = await ethers.getContractFactory('Musd');
//     ERC20TokenContract = await ERC20Token.connect(ERC20Account).deploy(
//       'MUSD',
//       'musd'
//     );
//     ERC20TokenContract = await ERC20TokenContract.deployed();
//     await ERC20TokenContract.connect(deployer).mint(SecondAccount, amount2);
//     await DeedContract.connect(deployer).setERC20Address(
//       ERC20TokenContract.address
//     );
//     await DeedContract.connect(deployer).setPlatformFees(platformFees);
//     await DeedContract.connect(deployer).setMogulPayoutAddress(
//       MogulPayout.address
//     );

//     await DeedContract.connect(deployer).setPercentage(estateId, 8000, 1000);
//     await DeedContract.connect(deployer).initiateAgreement(
//       propertyOwner.address,
//       maxSupply,
//       legaldoc
//     );
//     estateId = 0;
//     await DeedContract.connect(propertyOwner).enterPropertyDetails(
//       propertydoc,
//       estateId,
//       propertyPrice,
//       propertyOwnerRetains
//     );
//     await DeedContract.connect(deployer).setPercentage(estateId, 4000, 4000);

//     const EstateToken = await ethers.getContractFactory('EstateToken');
//     EstateTokenContract = await upgrades.deployProxy(EstateToken);
//     EstateTokenContract = await EstateTokenContract.deployed();
//     await EstateTokenContract.connect(deployer).updateDEEDAddress(
//       DeedContract.address
//     );
//     await EstateToken.connect(deployer).mintNewPropertyToken();

//     const Market = await ethers.getContractFactory('Marketplace');
//     MarketplaceContract = await upgrades.deployProxy(Market);
//     MarketplaceContract = await MarketplaceContract.deployed();
//   });
//   await MarketplaceContract.connect(deployer).exchange();
// });
INCOMPLETE;
