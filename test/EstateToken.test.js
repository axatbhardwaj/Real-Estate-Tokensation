const { inputToConfig } = require('@ethereum-waffle/compiler');
const chai = require('chai');
const { solidity } = require('ethereum-waffle');
chai.use(solidity);
const expect = chai.expect;
const describe = mocha.des
const { ethers } = require('hardhat');
require('dotenv').config();

describe('Estate Token Tests', function () {
  let EstateTokenContract;
  let deployer;
  let SecondAccount;
  let thirdAccount;
  let vestingContractAddress;
  let crowdsaleContractAddress;
  let vestingTokenAmount;
  let crowdsaleTokenAmount;
  const uri = 'Uri ';
  let estateId;
  let timetill;
  const penaltyPercentageDaily = 10;
  const nullAddress = '0x0000000000000000000000000000000000000000';

  let DeedContract;
  let ERC20TokenContract;
  let ERC20Account;
  let MogulPayout;
  let propertyOwner;
  let maxSupply = 200000;
  let legaldoc = 'This is legal doc';
  let propertydoc = 'This is property doc';
  let propertyPrice = 200000;
  let propertyOwnerRetains = 2000;
  let platformFees = 100000;

  beforeEach(async () => {
    [
      deployer,
      SecondAccount,
      thirdAccount,
      crowdsaleContractAddress,
      vestingContractAddress,
      ERC20Account,
      MogulPayout,
      propertyOwner,
    ] = await ethers.getSigners();
    const Deed = await ethers.getContractFactory('Deed');
    DeedContract = await upgrades.deployProxy(Deed);
    DeedContract = await DeedContract.deployed();
    const ERC20Token = await ethers.getContractFactory('Musd');
    ERC20TokenContract = await ERC20Token.connect(ERC20Account).deploy(
      'MUSD',
      'musd'
    );
    ERC20TokenContract = await ERC20TokenContract.deployed();
    await DeedContract.connect(deployer).setERC20Address(
      ERC20TokenContract.address
    );
    await DeedContract.connect(deployer).setPlatformFees(platformFees);
    await DeedContract.connect(deployer).setMogulPayoutAddress(
      MogulPayout.address
    );
    estateId = 0;
    for (i = 0; i < 10; i++) {
      await DeedContract.connect(deployer).initiateAgreement(
        propertyOwner.address,
        maxSupply,
        legaldoc
      );
      await DeedContract.connect(propertyOwner).enterPropertyDetails(
        propertydoc,
        estateId,
        propertyPrice,
        propertyOwnerRetains
      );
      await DeedContract.connect(deployer).setPercentage(estateId, 4000, 4000);
      estateId++;
    }
    await DeedContract.connect(deployer).initiateAgreement(
      propertyOwner.address,
      maxSupply,
      legaldoc
    );
    estateId = 0;
    await DeedContract.connect(propertyOwner).enterPropertyDetails(
      propertydoc,
      estateId,
      propertyPrice,
      propertyOwnerRetains
    );
    await DeedContract.connect(deployer).setPercentage(estateId, 4000, 4000);

    const EstateToken = await ethers.getContractFactory('EstateToken');
    EstateTokenContract = await upgrades.deployProxy(EstateToken);
    EstateTokenContract = await EstateTokenContract.deployed();
    await EstateTokenContract.connect(deployer).updateDEEDAddress(
      DeedContract.address
    );
    timetill = (await ethers.provider.getBlock()).timestamp + 60 * 60 * 24 * 7;
  });

  describe('End-to-End Test', function () {
    it('End-to-End', async () => {
      await EstateTokenContract.connect(deployer).updateVestingContractAddress(
        vestingContractAddress.address
      );
      await EstateTokenContract.connect(deployer).updateCrowdsaleAddress(
        crowdsaleContractAddress.address
      );
      await EstateTokenContract.connect(deployer).mintNewPropertyToken(
        uri,
        estateId
      );
      const crowdsaleAmount = (await DeedContract.agreements(estateId))[4];
      const vestingAmount = (await DeedContract.agreements(estateId))[2];
      const propertyOwnerAmount = (await DeedContract.agreements(estateId))[6];
      await EstateTokenContract.connect(
        crowdsaleContractAddress
      ).safeTransferFrom(
        crowdsaleContractAddress.address,
        SecondAccount.address,
        estateId,
        crowdsaleAmount / 2,
        []
      );
      expect(
        await EstateTokenContract.balanceOf(SecondAccount.address, estateId)
      ).to.be.equal(crowdsaleAmount / 2);
      await EstateTokenContract.connect(
        vestingContractAddress
      ).safeTransferFrom(
        vestingContractAddress.address,
        thirdAccount.address,
        estateId,
        vestingAmount / 2,
        []
      );
      expect(
        await EstateTokenContract.balanceOf(thirdAccount.address, estateId)
      ).to.be.equal(vestingAmount / 2);
      await EstateTokenContract.connect(deployer).delistToken(
        estateId,
        timetill,
        penaltyPercentageDaily
      );
      await expect(
        EstateTokenContract.connect(SecondAccount).safeTransferFrom(
          SecondAccount.address,
          thirdAccount.address,
          estateId,
          vestingAmount / 2,
          []
        )
      ).to.be.revertedWith('Token is not actively listed');
      const increasedTimeStamp = 10 * 24 * 60 * 60;
      await network.provider.send('evm_increaseTime', [increasedTimeStamp]);
      await network.provider.send('evm_mine');
      await expect(
        EstateTokenContract.connect(SecondAccount).burn(
          SecondAccount.address,
          estateId,
          crowdsaleAmount / 2
        )
      ).to.be.revertedWith('Burn time is over');
      await EstateTokenContract.connect(deployer).extendBurnDeadline(
        estateId,
        (await ethers.provider.getBlock()).timestamp + 60 * 60 * 24 * 7
      );
      await EstateTokenContract.connect(SecondAccount).burn(
        SecondAccount.address,
        estateId,
        crowdsaleAmount / 2
      );
      expect(
        await EstateTokenContract.balanceOf(SecondAccount.address, estateId)
      ).to.be.equal(0);
      await EstateTokenContract.connect(thirdAccount).burn(
        thirdAccount.address,
        estateId,
        vestingAmount / 2
      );
      expect(
        await EstateTokenContract.balanceOf(thirdAccount.address, estateId)
      ).to.be.equal(0);
    });
  });

  describe('Pause Token Test', function () {
    it('User other than Owner can not call this Function', async () => {
      // Check For The Owner(revert - caller is not the owner )
      await expect(
        EstateTokenContract.connect(SecondAccount).pause()
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('Owner can Paused the Token contract', async () => {
      // Pause contract
      await expect(EstateTokenContract.connect(deployer).pause())
        .to.emit(EstateTokenContract, 'Paused')
        .withArgs(deployer.address);
    });
  });

  describe('UnPause Token Test', function () {
    it('User other than Owner can not call this Function', async () => {
      // Check For The Owner(revert - caller is not the owner )
      await EstateTokenContract.connect(deployer).pause();
      await expect(
        EstateTokenContract.connect(SecondAccount).unPause()
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('Owner can unpaused the Token contract', async () => {
      // Pause contract
      await EstateTokenContract.connect(deployer).pause();
      await expect(EstateTokenContract.connect(deployer).unPause())
        .to.emit(EstateTokenContract, 'Unpaused')
        .withArgs(deployer.address);
    });
  });

  describe('updateCrowdsaleAddress Test', function () {
    it('User other than Owner can not call this Function', async () => {
      await expect(
        EstateTokenContract.connect(SecondAccount).updateCrowdsaleAddress(
          crowdsaleContractAddress.address
        )
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('crowdsale contract address can not be null', async () => {
      await expect(
        EstateTokenContract.connect(deployer).updateCrowdsaleAddress(
          nullAddress
        )
      ).to.be.revertedWith('Crowdsale contract address can not be null');
    });

    it('Owner can update the Crowdsale contract Address', async () => {
      await EstateTokenContract.connect(deployer).updateCrowdsaleAddress(
        crowdsaleContractAddress.address
      );
      expect(await EstateTokenContract.crowdsaleContractAddress()).to.equal(
        crowdsaleContractAddress.address
      );
    });
  });

  describe('updateVestingContractAddress Test', function () {
    it('User other than Owner can not call this Function', async () => {
      await expect(
        EstateTokenContract.connect(SecondAccount).updateVestingContractAddress(
          vestingContractAddress.address
        )
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('Vesting contract address can not be null', async () => {
      await expect(
        EstateTokenContract.connect(deployer).updateVestingContractAddress(
          nullAddress
        )
      ).to.be.revertedWith('Vesting contract address can not be null');
    });

    it('Owner can update the Vesting contract Address', async () => {
      await EstateTokenContract.connect(deployer).updateVestingContractAddress(
        vestingContractAddress.address
      );
      expect(await EstateTokenContract.vestingContractAddress()).to.equal(
        vestingContractAddress.address
      );
    });
  });

  describe('updateDEEDContractAddress Test', function () {
    it('User other than Owner can not call this Function', async () => {
      await expect(
        EstateTokenContract.connect(SecondAccount).updateDEEDAddress(
          DeedContract.address
        )
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('Deed address can not be null', async () => {
      await expect(
        EstateTokenContract.connect(deployer).updateDEEDAddress(nullAddress)
      ).to.be.revertedWith('Deed contract address can not be null');
    });

    it('Owner can update the Deed Address', async () => {
      await EstateTokenContract.connect(deployer).updateDEEDAddress(
        DeedContract.address
      );
      expect(await EstateTokenContract.DEED()).to.equal(DeedContract.address);
    });
  });

  describe('updateTokenURI Test', function () {
    it('User other than Owner can not call this Function', async () => {
      await EstateTokenContract.connect(deployer).updateVestingContractAddress(
        vestingContractAddress.address
      );
      await EstateTokenContract.connect(deployer).updateCrowdsaleAddress(
        crowdsaleContractAddress.address
      );
      await EstateTokenContract.connect(deployer).mintNewPropertyToken(
        uri,
        estateId
      );
      await expect(
        EstateTokenContract.connect(SecondAccount).updateTokenURI(
          estateId,
          'new_uri'
        )
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('Uri string can not be null', async () => {
      await EstateTokenContract.connect(deployer).updateVestingContractAddress(
        vestingContractAddress.address
      );
      await EstateTokenContract.connect(deployer).updateCrowdsaleAddress(
        crowdsaleContractAddress.address
      );
      await EstateTokenContract.connect(deployer).mintNewPropertyToken(
        uri,
        estateId
      );
      await expect(
        EstateTokenContract.connect(deployer).updateTokenURI(estateId, '')
      ).to.be.revertedWith('URI not found');
    });

    it('Owner can update the token URI', async () => {
      await EstateTokenContract.connect(deployer).updateVestingContractAddress(
        vestingContractAddress.address
      );
      await EstateTokenContract.connect(deployer).updateCrowdsaleAddress(
        crowdsaleContractAddress.address
      );
      await EstateTokenContract.connect(deployer).mintNewPropertyToken(
        uri,
        estateId
      );
      await EstateTokenContract.connect(deployer).updateTokenURI(
        estateId,
        'new_uri'
      );
      expect((await EstateTokenContract.tokenInfo(estateId))[6]).to.equal(
        'new_uri'
      );
    });
  });

  describe('mintNewPropertyToken Test', async function () {
    it('User other than Owner can not call this Function', async () => {
      // Check For The Owner(revert - caller is not the owner )
      await EstateTokenContract.connect(deployer).updateVestingContractAddress(
        vestingContractAddress.address
      );
      await EstateTokenContract.connect(deployer).updateCrowdsaleAddress(
        crowdsaleContractAddress.address
      );
      await expect(
        EstateTokenContract.connect(SecondAccount).mintNewPropertyToken(
          uri,
          estateId
        )
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('can not mint the already minted tokens', async () => {
      await EstateTokenContract.connect(deployer).updateVestingContractAddress(
        vestingContractAddress.address
      );
      await EstateTokenContract.connect(deployer).updateCrowdsaleAddress(
        crowdsaleContractAddress.address
      );
      await EstateTokenContract.connect(deployer).mintNewPropertyToken(
        uri,
        estateId
      );
      await expect(
        EstateTokenContract.connect(deployer).mintNewPropertyToken(
          uri,
          estateId
        )
      ).to.be.revertedWith('Token already minted');
    });

    it('Mint By the Owner', async () => {
      // mintNewPropertyToken By Owner
      await EstateTokenContract.connect(deployer).updateVestingContractAddress(
        vestingContractAddress.address
      );
      await EstateTokenContract.connect(deployer).updateCrowdsaleAddress(
        crowdsaleContractAddress.address
      );
      await expect(
        EstateTokenContract.connect(deployer).mintNewPropertyToken(
          uri,
          estateId
        )
      ).to.emit(EstateTokenContract, 'mintedNewPropertyToken');
      expect((await EstateTokenContract.tokenInfo(estateId))[6]).to.equal(uri);
      expect((await EstateTokenContract.tokenInfo(estateId))[0]).to.equal(true);
      expect((await EstateTokenContract.tokenInfo(estateId))[2]).to.equal(true);
    });

    it('Mint By null uri', async () => {
      // mintNewPropertyToken By Owner
      await EstateTokenContract.connect(deployer).updateVestingContractAddress(
        vestingContractAddress.address
      );
      await EstateTokenContract.connect(deployer).updateCrowdsaleAddress(
        crowdsaleContractAddress.address
      );
      await expect(
        EstateTokenContract.connect(deployer).mintNewPropertyToken('', estateId)
      ).to.be.revertedWith('URI not found');
    });

    it('Amount of tokens minted reflects in the balance of the vestingContractAddress and crowdsaleContractAddress', async () => {
      // Check For if Token Minted on vestingContractAddress
      await EstateTokenContract.connect(deployer).updateVestingContractAddress(
        vestingContractAddress.address
      );
      await EstateTokenContract.connect(deployer).updateCrowdsaleAddress(
        crowdsaleContractAddress.address
      );
      await EstateTokenContract.connect(deployer).mintNewPropertyToken(
        uri,
        estateId
      );
      vestingTokenAmount =
        (maxSupply * 4000) / 10000 + (maxSupply * 2000) / 10000;
      crowdsaleTokenAmount = (maxSupply * 4000) / 10000;
      expect(
        await EstateTokenContract.balanceOf(
          vestingContractAddress.address,
          estateId
        )
      ).to.be.equal(vestingTokenAmount);
      expect(
        await EstateTokenContract.balanceOf(
          crowdsaleContractAddress.address,
          estateId
        )
      ).to.be.equal(crowdsaleTokenAmount);
    });

    it('Total supply should equal to amount of Minted Token', async () => {
      // Check For if Token Minted on updateCrowdsaleAddress
      await EstateTokenContract.connect(deployer).updateVestingContractAddress(
        vestingContractAddress.address
      );
      await EstateTokenContract.connect(deployer).updateCrowdsaleAddress(
        crowdsaleContractAddress.address
      );
      await EstateTokenContract.connect(deployer).mintNewPropertyToken(
        uri,
        estateId
      );
      vestingTokenAmount =
        (maxSupply * 4000) / 10000 + (maxSupply * 2000) / 10000;
      crowdsaleTokenAmount = (maxSupply * 4000) / 10000;
      expect(await EstateTokenContract.totalSupply(estateId)).to.be.equal(
        vestingTokenAmount + crowdsaleTokenAmount
      );
    });
  });

  describe('delistToken Test', function () {
    it('User other than Owner can not call this Function', async () => {
      // Check For The Owner(revert - caller is not the owner )
      await EstateTokenContract.connect(deployer).updateVestingContractAddress(
        vestingContractAddress.address
      );
      await EstateTokenContract.connect(deployer).updateCrowdsaleAddress(
        crowdsaleContractAddress.address
      );
      await EstateTokenContract.connect(deployer).mintNewPropertyToken(
        uri,
        estateId
      );
      await expect(
        EstateTokenContract.connect(SecondAccount).delistToken(
          estateId,
          timetill,
          penaltyPercentageDaily
        )
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('Owner can delist the token', async () => {
      // Check with non exist token(revert - Token is not listed )
      await EstateTokenContract.connect(deployer).updateVestingContractAddress(
        vestingContractAddress.address
      );
      await EstateTokenContract.connect(deployer).updateCrowdsaleAddress(
        crowdsaleContractAddress.address
      );
      await EstateTokenContract.connect(deployer).mintNewPropertyToken(
        uri,
        estateId
      );
      await expect(
        EstateTokenContract.connect(deployer).delistToken(
          estateId,
          timetill,
          penaltyPercentageDaily
        )
      ).to.emit(EstateTokenContract, 'tokenDelist');
      expect((await EstateTokenContract.tokenInfo(estateId))[1]).to.equal(true);
      expect((await EstateTokenContract.tokenInfo(estateId))[2]).to.equal(
        false
      );
      expect((await EstateTokenContract.tokenInfo(estateId))[3]).to.equal(
        timetill
      );
      expect((await EstateTokenContract.tokenInfo(estateId))[5]).to.equal(
        penaltyPercentageDaily
      );
    });

    it('with non exist token', async () => {
      // Check with non exist token(revert - Token is not listed )
      await EstateTokenContract.connect(deployer).updateVestingContractAddress(
        vestingContractAddress.address
      );
      await EstateTokenContract.connect(deployer).updateCrowdsaleAddress(
        crowdsaleContractAddress.address
      );
      await EstateTokenContract.connect(deployer).mintNewPropertyToken(
        uri,
        estateId
      );
      await expect(
        EstateTokenContract.connect(deployer).delistToken(
          3,
          timetill,
          penaltyPercentageDaily
        )
      ).to.be.revertedWith('Token is not listed');
    });
  });

  describe('burn Test', function () {
    it('Only token holders can burn the tokens', async () => {
      await EstateTokenContract.connect(deployer).updateVestingContractAddress(
        vestingContractAddress.address
      );
      await EstateTokenContract.connect(deployer).updateCrowdsaleAddress(
        crowdsaleContractAddress.address
      );
      await EstateTokenContract.connect(deployer).mintNewPropertyToken(
        uri,
        estateId
      );
      await EstateTokenContract.connect(deployer).delistToken(
        estateId,
        timetill,
        penaltyPercentageDaily
      );
      await expect(
        EstateTokenContract.connect(SecondAccount).burn(
          crowdsaleContractAddress.address,
          estateId,
          crowdsaleTokenAmount
        )
      ).to.be.revertedWith('ERC1155: caller is not owner nor approved');
    });

    it('Token holders can burn their tokens', async () => {
      await EstateTokenContract.connect(deployer).updateVestingContractAddress(
        vestingContractAddress.address
      );
      await EstateTokenContract.connect(deployer).updateCrowdsaleAddress(
        crowdsaleContractAddress.address
      );
      await EstateTokenContract.connect(deployer).mintNewPropertyToken(
        uri,
        estateId
      );
      await EstateTokenContract.connect(deployer).delistToken(
        estateId,
        timetill,
        penaltyPercentageDaily
      );
      await EstateTokenContract.connect(crowdsaleContractAddress).burn(
        crowdsaleContractAddress.address,
        estateId,
        crowdsaleTokenAmount
      );
      expect(await EstateTokenContract.totalSupply(estateId)).to.be.equal(
        vestingTokenAmount
      );
    });

    it("Token can't be burn if its actively listed", async () => {
      await EstateTokenContract.connect(deployer).updateVestingContractAddress(
        vestingContractAddress.address
      );
      await EstateTokenContract.connect(deployer).updateCrowdsaleAddress(
        crowdsaleContractAddress.address
      );
      await EstateTokenContract.connect(deployer).mintNewPropertyToken(
        uri,
        estateId
      );
      await expect(
        EstateTokenContract.connect(crowdsaleContractAddress).burn(
          crowdsaleContractAddress.address,
          estateId,
          crowdsaleTokenAmount
        )
      ).to.be.revertedWith('Burning is not allowed at the moment');
    });

    it("Can't burn the non existing tokens", async () => {
      await EstateTokenContract.connect(deployer).updateVestingContractAddress(
        vestingContractAddress.address
      );
      await EstateTokenContract.connect(deployer).updateCrowdsaleAddress(
        crowdsaleContractAddress.address
      );
      await EstateTokenContract.connect(deployer).mintNewPropertyToken(
        uri,
        estateId
      );
      await EstateTokenContract.connect(deployer).delistToken(
        estateId,
        timetill,
        penaltyPercentageDaily
      );
      await EstateTokenContract.connect(crowdsaleContractAddress).burn(
        crowdsaleContractAddress.address,
        estateId,
        1000
      );
      await expect(
        EstateTokenContract.connect(crowdsaleContractAddress).burn(
          crowdsaleContractAddress.address,
          estateId,
          crowdsaleTokenAmount
        )
      ).to.be.revertedWith(
        'Amount exceeds the available balance to burn with this token-id in this account'
      );
    });

    it('can not burn the tokens after the burn time has expired', async () => {
      await EstateTokenContract.connect(deployer).updateVestingContractAddress(
        vestingContractAddress.address
      );
      await EstateTokenContract.connect(deployer).updateCrowdsaleAddress(
        crowdsaleContractAddress.address
      );
      await EstateTokenContract.connect(deployer).mintNewPropertyToken(
        uri,
        estateId
      );
      await EstateTokenContract.connect(deployer).delistToken(
        estateId,
        timetill,
        penaltyPercentageDaily
      );
      const submitTimeStamp = 60 * 60 * 24 * 10;
      await network.provider.send('evm_increaseTime', [submitTimeStamp]);
      await network.provider.send('evm_mine');
      await expect(
        EstateTokenContract.connect(crowdsaleContractAddress).burn(
          crowdsaleContractAddress.address,
          estateId,
          1000
        )
      ).to.be.revertedWith('Burn time is over');
    });
  });

  describe('extendBurnDeadline Tests', function () {
    it('User other than Owner can not call this Function', async () => {
      await EstateTokenContract.connect(deployer).updateVestingContractAddress(
        vestingContractAddress.address
      );
      await EstateTokenContract.connect(deployer).updateCrowdsaleAddress(
        crowdsaleContractAddress.address
      );
      await EstateTokenContract.connect(deployer).mintNewPropertyToken(
        uri,
        estateId
      );
      await EstateTokenContract.connect(deployer).delistToken(
        estateId,
        timetill,
        penaltyPercentageDaily
      );
      await expect(
        EstateTokenContract.connect(SecondAccount).extendBurnDeadline(
          estateId,
          timetill + 60 * 60 * 24 * 7
        )
      ).to.be.revertedWith('Ownable: caller is not the owner');
    });

    it('User other than Owner can not call this Function', async () => {
      await EstateTokenContract.connect(deployer).updateVestingContractAddress(
        vestingContractAddress.address
      );
      await EstateTokenContract.connect(deployer).updateCrowdsaleAddress(
        crowdsaleContractAddress.address
      );
      await EstateTokenContract.connect(deployer).mintNewPropertyToken(
        uri,
        estateId
      );
      //await EstateTokenContract.connect(deployer).delistToken(estateId, timetill, penaltyPercentageDaily);
      await expect(
        EstateTokenContract.connect(deployer).extendBurnDeadline(
          estateId,
          timetill + 60 * 60 * 24 * 7
        )
      ).to.be.revertedWith('Burning is not allowed at the moment');
    });

    it('extented time should be more than current allowed time', async () => {
      await EstateTokenContract.connect(deployer).updateVestingContractAddress(
        vestingContractAddress.address
      );
      await EstateTokenContract.connect(deployer).updateCrowdsaleAddress(
        crowdsaleContractAddress.address
      );
      await EstateTokenContract.connect(deployer).mintNewPropertyToken(
        uri,
        estateId
      );
      await EstateTokenContract.connect(deployer).delistToken(
        estateId,
        timetill,
        penaltyPercentageDaily
      );
      await expect(
        EstateTokenContract.connect(deployer).extendBurnDeadline(
          estateId,
          timetill - 60 * 60 * 24 * 8
        )
      ).to.be.revertedWith('Extension time is less than the current time');
    });

    it('Burning deadline should be extended', async () => {
      await EstateTokenContract.connect(deployer).updateVestingContractAddress(
        vestingContractAddress.address
      );
      await EstateTokenContract.connect(deployer).updateCrowdsaleAddress(
        crowdsaleContractAddress.address
      );
      await EstateTokenContract.connect(deployer).mintNewPropertyToken(
        uri,
        estateId
      );
      await EstateTokenContract.connect(deployer).delistToken(
        estateId,
        timetill,
        penaltyPercentageDaily
      );
      await expect(
        EstateTokenContract.connect(deployer).extendBurnDeadline(
          estateId,
          timetill + 60 * 60 * 24 * 7
        )
      ).to.emit(EstateTokenContract, 'extendedBurnDeadline');
      expect((await EstateTokenContract.tokenInfo(estateId))[3]).to.equal(
        timetill + 60 * 60 * 24 * 7
      );
    });
  });

  describe('penaltyPercentageCalculator Tests', async () => {
    it('penaltyPercentageCalculator should return the expected value', async function () {
      await EstateTokenContract.connect(deployer).updateVestingContractAddress(
        vestingContractAddress.address
      );
      await EstateTokenContract.connect(deployer).updateCrowdsaleAddress(
        crowdsaleContractAddress.address
      );
      await EstateTokenContract.connect(deployer).mintNewPropertyToken(
        uri,
        estateId
      );
      await EstateTokenContract.connect(deployer).delistToken(
        estateId,
        timetill,
        penaltyPercentageDaily
      );
      const increasedTimeStamp = 60 * 60 * 24 * 10;
      await network.provider.send('evm_increaseTime', [increasedTimeStamp]);
      await network.provider.send('evm_mine');
      const penalty =
        (penaltyPercentageDaily * (await ethers.provider.getBlock()).timestamp -
          timetill) /
        (60 * 60 * 24);
      expect(
        await EstateTokenContract.penaltyPercentageCalculator(
          penaltyPercentageDaily,
          estateId
        )
      ).to.equal(Math.floor(penalty));
    });
  });
});
