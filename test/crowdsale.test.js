const { expect } = require("chai");
const { ethers } = require("hardhat");
const hre = require("hardhat");
var Web3 = require('web3');
var web3 = new Web3();
require('dotenv').config()

describe("Deploy and Initialize ICO ", function () {

  let ICOAdd; let MUSDAdd; let ERC1155; let DeedAdd; let DeedAdd1; let investorsAddressArray = []
  it("Should return owner after contract initialzation", async function () {
    [owner, addr0, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();
    investorsAddressArray.push(addr0.address)
    investorsAddressArray.push(addr1.address)

    const ICO = await hre.ethers.getContractFactory("ICO");
    const ico = await upgrades.deployProxy(ICO);
    ICOAdd = await ico.deployed();

    const MUSD = await hre.ethers.getContractFactory("Musd");
    const _MUSD = await MUSD.deploy("MUSD", "MUSD");
    MUSDAdd = await _MUSD.deployed();

    const ERC = await hre.ethers.getContractFactory("EstateToken");
    const erc = await upgrades.deployProxy(ERC)
    ERC1155 = await erc.deployed();

    const DEED = await hre.ethers.getContractFactory("Deed");
    const deed = await upgrades.deployProxy(DEED)
    DeedAdd = await deed.deployed();

    await ico.Initialize(owner.address,
      _MUSD.address,
      erc.address)

    const ownerAddress = await ICOAdd.__whitelistAdminAdd();
    expect(ownerAddress).to.equal(owner.address);
  });

  describe("Setup ICO", function () {
    it("Should setup ico for estateID id", async function () {
      const blocktime = (await ethers.provider.getBlock()).timestamp
      let _startTimestamp = blocktime + 120
      let _finishTimestamp = blocktime + 400
      let _minMUSD_limit = 12
      let _maxMUSD_limit = 120
      let _hardCap = 50000
      let moguletokenPrice = 7
      await ICOAdd.setupICO(_startTimestamp, _finishTimestamp, _minMUSD_limit, _maxMUSD_limit, 0, _hardCap, 48, moguletokenPrice);
      await ICOAdd.setupICO(_startTimestamp, _finishTimestamp, _minMUSD_limit, _maxMUSD_limit, 1, _hardCap, 100, moguletokenPrice);
      let setupICOres1 = Object.assign({}, await ICOAdd.getICOinfo(0))
      let setupICOres2 = Object.assign({}, await ICOAdd.getICOinfo(1))
      expect(setupICOres1.state).to.equal(true)
      expect(setupICOres2.state).to.equal(true)
    })
  });

  describe("Mint and Approve MUSD", function () {
    it("Should Mint MUSD for Address1", async function () {
      await MUSDAdd.mint(addr0.address, 10000)
      let balanceof = await MUSDAdd.balanceOf(addr0.address)
      expect(balanceof).to.equal(10000)
    })

    it("Should Mint MUSD for Address4", async function () {
      await MUSDAdd.mint(addr1.address, 10000)
      let balanceof = await MUSDAdd.balanceOf(addr1.address)
      expect(balanceof).to.equal(10000)
    })

    it("Should approve adress1 MUSD for ICO", async function () {
      let temp = addr0.address
      await MUSDAdd.connect(addr0).approve(ICOAdd.address, 9999999)
      let allowance = await MUSDAdd.allowance(temp, ICOAdd.address)
      expect(allowance).to.equal(9999999)
    })

    it("Should approve address2 MUSD for ICO", async function () {
      let temp = addr1.address
      await MUSDAdd.connect(addr1).approve(ICOAdd.address, 9999999)
      let allowance = await MUSDAdd.allowance(temp, ICOAdd.address)
      expect(allowance).to.equal(9999999)
    })
  })

  describe("Deed initiateAgreement for estateID 0", function () {

    it("Should initiateAgreement", async function () {
      await DeedAdd.initiateAgreement(owner.address, 10000, "string legal doc")
    })

    it("Should set PropertyDetails", async function () {
      await DeedAdd.enterPropertyDetails("testProperty", 0, 1234, 1000)
    })

    it("Should set percentqage of mogul and crowdsale", async function () {
      await DeedAdd.setPercentage(0, 2000, 7000)
    })

    it("Should initiateAgreement for estateID 1", async function () {
      await DeedAdd.initiateAgreement(owner.address, 10000, "string legal doc2")
    })

    it("Should set PropertyDetails for estateID 1", async function () {
      await DeedAdd.enterPropertyDetails("testProperty", 1, 1234, 1000)
    })

    it("Should set percentqage of mogul and crowdsale for estateID 1", async function () {
      await DeedAdd.setPercentage(1, 2000, 7000)
    })

  })


  describe("Set ERC1155", function () {

    it("Should set deed contract address", async () => {
      await ERC1155.updateDEEDAddress(DeedAdd.address)
      expect(await ERC1155.DEED()).to.equal(DeedAdd.address)
    })

    it("Should set ico address to estate contract", async function () {
      await ERC1155.updateCrowdsaleAddress(ICOAdd.address)
      let uca = await ERC1155.crowdsaleContractAddress()
      expect(uca).to.equal(ICOAdd.address);
    })

    it("Should set vesting address to estate contract", async function () {
      const { address: defaultRecipient } = web3.eth.accounts.create();
      await ERC1155.updateVestingContractAddress(defaultRecipient) // taking random address for vesting
      let uca = await ERC1155.vestingContractAddress()
      expect(uca).to.equal(defaultRecipient);
    })

    it("Should mint nfts to ico", async function () {
      await ERC1155.mintNewPropertyToken("test.json", 0) // minted for ico 0
      await ERC1155.mintNewPropertyToken("test2.json", 1) // minted for ico 1
      let mintedtoken1 = await ERC1155.balanceOf(ICOAdd.address, 0)
      let mintedtoken2 = await ERC1155.balanceOf(ICOAdd.address, 1)
      expect(mintedtoken1).to.equal(7000);
      expect(mintedtoken2).to.equal(7000);
    })
  })

  describe("Set Admin Approval", function (params) {
    it("Should set admin roles and thier approval for claim", async function () {
      let adminArr = [addr3.address, addr2.address]
      await ICOAdd.setAdminRoles(adminArr)
      const sign = []
      let adminroles = [process.env.admin1Key, process.env.admin2Key]
      for (i = 0; i < 2; i++) {
        params = { recipient: ICOAdd.address, nonce: 2, ...params };
        const message = web3.utils.soliditySha3(
          { t: 'address', v: params.recipient },
          { t: 'uint256', v: params.nonce }
        ).toString('hex');
        const privKey = adminroles[i];
        const { signature } = web3.eth.accounts.sign(
          message,
          privKey
        );
        sign.push(signature)
      }
      await ICOAdd.adminApproval(sign, 0)
      await ICOAdd.adminApproval(sign, 1)
      let icoInfo1 = Object.assign({}, await ICOAdd.getICOinfo(0))
      let icoInfo2 = Object.assign({}, await ICOAdd.getICOinfo(0))
      expect(icoInfo1._isGreenFlag_).to.equal(true);
      expect(icoInfo2._isGreenFlag_).to.equal(true);

    })
  })

  describe("Update Hardcap", function () {
    it("Should update hardcap for ico", async () => {
      await ICOAdd.updateHardCap(1, 4000)
      let updatedHardpcap = Object.assign({}, await ICOAdd.getICOinfo(1))
      expect(updatedHardpcap._hardCap_).to.equal(4000)
    })

    it("Should revert with error", async () => {
      await expect(ICOAdd.updateHardCap(1, 88)).to.be.revertedWith("ICO: set max-goal higher than min-goal")
    })
  })

  describe("Update Softcap", function () {
    it("Should update softcap for ico", async () => {
      await ICOAdd.updateSoftCap(1, 99)
      let updatedHardpcap = Object.assign({}, await ICOAdd.getICOinfo(1))
      expect(updatedHardpcap._softCap_).to.equal(99)
    })

    it("Should revert with error", async () => {
      await expect(ICOAdd.updateSoftCap(1, 4001)).to.be.revertedWith("ICO: set min-goal lower than max-goal")
    })
  })

  describe("Update Max MUSD investment", function () {
    it("Should update MUSD for ico", async () => {
      await ICOAdd.updateMaxMUSDLimit(1, 110)
      let updatedHardpcap = Object.assign({}, await ICOAdd.getICOinfo(1))
      expect(updatedHardpcap._maxMUSD_limit_).to.equal(110)
    })

    it("Should revert with error", async () => {
      await expect(ICOAdd.updateMaxMUSDLimit(1, 11)).to.be.revertedWith("ICO: set musd max limt higher than min-goal")
    })
  })

  describe("Update Min MUSD investment", function () {
    it("Should update hardcap for ico", async () => {
      await ICOAdd.updateMinMUSDLimit(1, 13)
      let updatedHardpcap = Object.assign({}, await ICOAdd.getICOinfo(1))
      expect(updatedHardpcap._minMUSD_limit_).to.equal(13)
    })

    it("Should revert with error", async () => {
      await expect(ICOAdd.updateMinMUSDLimit(1, 112)).to.be.revertedWith("ICO: set musd min limt lower than max-goal")
    })
  })

  describe("Extend ico time", function () {
    it("Should revise time for ico", async () => {
      const blocktime = (await ethers.provider.getBlock()).timestamp
      let updatedTime = blocktime + 402
      await ICOAdd.extendIcoTime(1, updatedTime)
    })
  })

  describe("Change state for ico", function () {
    it("Should change state for ico", async () => {
      await ICOAdd.changeState(1)
      let updatedState = Object.assign({}, await ICOAdd.getICOinfo(1))
      expect(updatedState.state).to.equal(false)
      await ICOAdd.changeState(1)
    })
  })

  describe("Invest MUSD", function (params) {
    it("Should invest MUSD only for whitelisted users(address1 and address2)", async function () {
      await network.provider.send("evm_increaseTime", [141])
      await network.provider.send("evm_mine")
      let investmentForaddr0; let investmentForaddr1;
      for (i = 0; i < 2; i++) {
        params = { recipient: investorsAddressArray[i], nonce: i };
        const message = web3.utils.soliditySha3(
          { t: 'address', v: params.recipient },
          { t: 'uint256', v: params.nonce }
        ).toString('hex');
        const privKey = process.env.whitelistOwnerKey;
        const { signature } = web3.eth.accounts.sign(
          message,
          privKey
        );
        let _user = [addr0, addr1]
        let _nonce = i
        let _sign = signature
        let MUSD = 49
        const tx1 = await ICOAdd.connect(_user[i]).invest(_nonce, _sign, MUSD, 0);
        let logs1 = await tx1.wait();
        investmentForaddr0 = logs1.events[0].data
        const tx2 = await ICOAdd.connect(_user[i]).invest(_nonce, _sign, MUSD, 1);
        let logs2 = await tx2.wait();
        investmentForaddr1 = logs2.events[0].data
      }
      expect(web3.utils.hexToNumber(investmentForaddr0)).to.equal(49)
      expect(web3.utils.hexToNumber(investmentForaddr1)).to.equal(49)
    })

    it("Should denied for investment for non-whitlisted users", async () => {
      let fakeSign = web3.utils.randomHex(32)
      await expect(ICOAdd.connect(addr2).invest(2, fakeSign, 32, 0)).to.be.revertedWith("must be whitelisted")
    })
  })

  describe("AirDrop ", function () { // airdrop for ico 0
    it("Should Airdrop token to all users", async function () {
      await network.provider.send("evm_increaseTime", [404])
      await network.provider.send("evm_mine")
      await ICOAdd.airDropToken(investorsAddressArray, 0)
    })

    it("Should return users mogul token amount", async function () {
      let user1 = await ERC1155.balanceOf(investorsAddressArray[0], 0)
      let user2 = await ERC1155.balanceOf(investorsAddressArray[1], 0)
      expect(user1).to.equal(7);
      expect(user2).to.equal(7);
    })
  })

  describe("Withdraw", function () {
    it("Should withdraw MUSD", async function () {
      const tx = await ICOAdd.withdraw(owner.address, 0);
      let logs = await tx.wait();
      let hexa = logs.events[0].data
      let withdrawnAmount = await ICOAdd.withdrawnMUSDByID(0)
      expect(web3.utils.hexToNumber(hexa)).to.equal(withdrawnAmount)      
    })

    it("Should revert for withdraw", async function () {
      await expect(ICOAdd.withdraw(owner.address, 5)).to.be.revertedWith("ICO: estatedId is not active")
    })
  })

  describe("Refund", function () { // refund for ico 1
    it("Should refund MUSD", async function () {
      await network.provider.send("evm_increaseTime", [44])
      await network.provider.send("evm_mine")
      for (i = 0; i < 2; i++) {
        let _user = [addr0, addr1]
        const tx = await ICOAdd.connect(_user[i]).refund(1)
        let logs = await tx.wait();
        let hexa = logs.events[0].data
        expect(web3.utils.hexToNumber(hexa)).to.equal(49)
      }

    })
    it("Should return total refunded amount to users", async function () {
      let refundedObj = Object.assign({}, await ICOAdd.getICOinfo(1))
      expect(refundedObj._refundedMUSD_).to.equal(98)
    })
  })
});

