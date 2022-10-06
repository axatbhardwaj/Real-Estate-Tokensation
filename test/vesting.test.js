const { expect } = require("chai");
const { ethers } = require("hardhat");
const hre = require("hardhat");
var Web3 = require('web3');
var web3 = new Web3();
require('dotenv').config()

describe("Deployment and Initialize Of Vesting ", function () {

    let ICOAdd; let MUSDAdd; let ERC1155; let VestingAdd;

    it("Should return owner after contract initialzation", async function () {
        [owner, addr0, addr1, addr2, addr3, ...addrs] = await ethers.getSigners();
        const MUSD = await hre.ethers.getContractFactory("Musd");
        const _MUSD = await MUSD.deploy("MUSD", "MUSD");
        MUSDAdd = await _MUSD.deployed();

        const ERC = await hre.ethers.getContractFactory("EstateToken");
        const erc = await upgrades.deployProxy(ERC);
        ERC1155 = await erc.deployed();

        const ICO = await hre.ethers.getContractFactory("ICO");
        const ico = await upgrades.deployProxy(ICO);
        ICOAdd = await ico.deployed();

        const Vesting = await hre.ethers.getContractFactory("Vesting");
        const vesting = await upgrades.deployProxy(Vesting);
        VestingAdd = await vesting.deployed();

        const Deed = await hre.ethers.getContractFactory("Deed");
        const deed = await upgrades.deployProxy(Deed);
        deedAdd = await deed.deployed();

        await ico.Initialize(
            owner.address,
            _MUSD.address,
            erc.address
        )
        await vesting.Initialize(
            deedAdd.address,
            MUSDAdd.address,
            ERC1155.address,
            ICOAdd.address,
        )
    });

    describe("Deed initiateAgreement", function () {


        it("Should set deed contract address", async () => {
            await ERC1155.updateDEEDAddress(deedAdd.address)
            expect(await ERC1155.DEED()).to.equal(deedAdd.address)
        })

        it("Should initiateAgreement", async function () {
            await deedAdd.initiateAgreement(owner.address, 10000, "string legal doc")
        })

        it("Should set PropertyDetails", async function () {
            await deedAdd.enterPropertyDetails("testProperty", 0, 1234, 1000)
        })

        it("Should set percentqage of mogul and crowdsale", async function () {
            await deedAdd.setPercentage(0, 2000, 7000)
        })
    })

    describe("Mint ERC1155 for vesting contract", function () {

        it("Should set ico address in estate contract", async function () {
            const { address: defaultRecipient } = web3.eth.accounts.create();
            await ERC1155.updateCrowdsaleAddress(defaultRecipient) // taking random address for vesting
            let randomaddress = await ERC1155.crowdsaleContractAddress()
            expect(randomaddress).to.equal(randomaddress);
        })

        it("Should set vesting address in estate contract", async function () {
            await ERC1155.updateVestingContractAddress(VestingAdd.address)
            let vestingAddress = await ERC1155.vestingContractAddress()
            expect(vestingAddress).to.equal(VestingAdd.address);
        })

        it("Should mint nfts to vesting", async function () {
            await ERC1155.mintNewPropertyToken("test.json", 0)
            let mintedtoken = await ERC1155.balanceOf(VestingAdd.address, 0)
            expect(mintedtoken).to.equal(3000);
        })
    })

    describe("Mint and approve MUSD", function () {

        it("Should Mint MUSD for propertyOwner", async function () {
            await MUSDAdd.mint(addr0.address, 10000)
            let balanceof = await MUSDAdd.balanceOf(addr0.address)
            expect(balanceof).to.equal(10000)

        })

        it("Should approve adress1 MUSD for ICO", async function () {
            let temp = addr0.address
            await MUSDAdd.connect(addr0).approve(ICOAdd.address, 9999999)
            let allowance = await MUSDAdd.allowance(temp, ICOAdd.address)
            expect(allowance).to.equal(9999999)
        })

        it("Should Mint MUSD for mogulPlatform", async function () {
            await MUSDAdd.mint(addr1.address, 10000)
            let balanceof = await MUSDAdd.balanceOf(addr1.address)
            expect(balanceof).to.equal(10000)

        })

        it("Should approve propertyOwner MUSD for vesting contract", async function () {
            let temp = addr0.address
            await MUSDAdd.connect(addr0).approve(VestingAdd.address, 9999999)
            let allowance = await MUSDAdd.allowance(temp, VestingAdd.address)
            expect(allowance).to.equal(9999999)

        })

        it("Should approve mogulPlatform MUSD for vesting contract", async function () {
            let temp = addr1.address
            await MUSDAdd.connect(addr1).approve(VestingAdd.address, 9999999)
            let allowance = await MUSDAdd.allowance(temp, VestingAdd.address)
            expect(allowance).to.equal(9999999)

        })
    })

    describe("Set admin roles", function () {

        it("Should set propertyOwner & mogulPlatform", async function () {
            await VestingAdd.updateAdminRoles(0, addr0.address, addr1.address);
            const _bytes32_propertyOwner = web3.utils.soliditySha3(
                { t: 'string', v: "propertyOwner" },
                { t: 'address', v: addr0.address },

            ).toString('hex');
            const _bytes32_mogulPlatform = web3.utils.soliditySha3(
                { t: 'string', v: "mogulPlatform" },
                { t: 'address', v: addr1.address },

            ).toString('hex');
            let propertyOwner_ = await VestingAdd.roles(0, _bytes32_propertyOwner);
            let mogulPlatform_ = await VestingAdd.roles(0, _bytes32_mogulPlatform);
            expect(propertyOwner_).to.equal(true)
            expect(mogulPlatform_).to.equal(true)
            
            
        })

    })

    describe("Start vesting for estateID", function () {
        let icoInfo;
        
        it("Should setup ICO values", async function () {
            const blocktime = (await ethers.provider.getBlock()).timestamp
            let _startTimestamp = blocktime + 1200
            let _finishTimestamp = blocktime + 4000
            let _minMUSD_limit = 18
            let _maxMUSD_limit = 500
            let _estateID = 0
            let _hardCap = 60000
            let _softCap = 88
            let mogulTokenPrice = 2
            await ICOAdd.connect(owner).setupICO(_startTimestamp, _finishTimestamp, _minMUSD_limit, _maxMUSD_limit, _estateID, _hardCap, _softCap, mogulTokenPrice);
            icoInfo = Object.assign({}, await ICOAdd.getICOinfo(0));
        })

        it("Should invest MUSD only for whitelisted users", async function () {
            const blocktime = (await ethers.provider.getBlock()).timestamp
            await network.provider.send("evm_increaseTime", [1300])
            await network.provider.send("evm_mine")
            params = { recipient: addr0.address, nonce: 0 };
            const message = web3.utils.soliditySha3(
                { t: 'address', v: params.recipient },
                { t: 'uint256', v: params.nonce }
            ).toString('hex');
            const privKey = process.env.whitelistOwnerKey;
            const { signature } = web3.eth.accounts.sign(
                message,
                privKey
            );
            let _nonce = 0
            let _sign = signature
            let MUSD = 220
            await ICOAdd.connect(addr0).invest(_nonce, _sign, MUSD, 0);
        })

        it("Should able to fetch ICO values", async function () {
            await VestingAdd.startVestingForEstateID(0);
            let vestingInfo = Object.assign({}, await VestingAdd.getVestingDetailsForEstateID(0))
            expect(icoInfo._startTimestamp_).to.equal(vestingInfo.start)
        })

        it("Should revert for same estateID", async function () {
            await expect(VestingAdd.startVestingForEstateID(0)).to.be.revertedWith("Vesting: estateID already in vesting state")
        })

        it("Should revert for non-exist estateID", async function () {
            await expect(VestingAdd.startVestingForEstateID(2)).to.be.revertedWith("Vesting: estateID not exist")
        })

    })

    describe("Update vesting for estateID", function () {
        let icoInfo;
        it("Should setup ICO values", async function () {
            const blocktime = (await ethers.provider.getBlock()).timestamp
            let _startTimestamp = blocktime + 86400
            let _finishTimestamp = blocktime + 87400
            let _minMUSD_limit = 18
            let _maxMUSD_limit = 133
            let _estateID = 1
            let _hardCap = 60000
            let _softCap = 88
            let mogulTokenPrice = 22
            await ICOAdd.connect(owner).setupICO(_startTimestamp, _finishTimestamp, _minMUSD_limit, _maxMUSD_limit, _estateID, _hardCap, _softCap, mogulTokenPrice);
            icoInfo = Object.assign({}, await ICOAdd.getICOinfo(1));
        })

        it("Should able to fetch ICO values", async function () {
            await VestingAdd.startVestingForEstateID(1);
            await VestingAdd.updateVestingForEstateID(1);
            let vestingInfo = Object.assign({}, await VestingAdd.getVestingDetailsForEstateID(1))
            expect(icoInfo.state).to.equal(vestingInfo.isActive)
        })

    })

    describe("Release vested token for Mogul ", function () {

        it("Should revert for non-multiple MUSD ", async function () {
            await network.provider.send("evm_increaseTime", [4800])
            await network.provider.send("evm_mine")
            await expect(VestingAdd.connect(addr1).releaseTokenForMogulPlatform(0, 3)).to.be.revertedWith("Vesting: musd should be in mogulTokenPrice multiple")
        })

        it("Should Only mogul  able to claim token after vesting", async function () {
            await network.provider.send("evm_increaseTime", [4800])
            await network.provider.send("evm_mine")
            await VestingAdd.connect(addr1).releaseTokenForMogulPlatform(0, 200)
            await VestingAdd.connect(addr1).releaseTokenForMogulPlatform(0, 6)
            await VestingAdd.connect(addr1).releaseTokenForMogulPlatform(0, 794)
            let receviedBalancesStruct = Object.assign({}, await VestingAdd.getAdminBalance(0, addr1.address))
            expect(receviedBalancesStruct.musdTokenBal).to.equal(1000)
            expect(receviedBalancesStruct.currentEstateTokenBal).to.equal(500)
            let propertyOwnerBalance =  await MUSDAdd.connect(addr0).balanceOf(addr0.address)
            expect(propertyOwnerBalance).to.equal(10780)
            
        })

        it("Should revert for un-assigned roles ", async function () {
            await network.provider.send("evm_increaseTime", [4800])
            await network.provider.send("evm_mine")
            await expect(VestingAdd.connect(addr0).releaseTokenForMogulPlatform(0, 2)).to.be.revertedWith("not authorized")
        })
    })

    describe("Release vested token for property owner", function () {

        it("Should revert for un-assigned roles ", async function () {
            await network.provider.send("evm_increaseTime", [4800])
            await network.provider.send("evm_mine")
            await expect(VestingAdd.connect(addr1).releaseTokenForPropertyOwner(0)).to.be.revertedWith("not authorized")
        })

        it("Should Only owner to claim token after vesting", async function () {
            await network.provider.send("evm_increaseTime", [4800])
            await network.provider.send("evm_mine")
            await VestingAdd.connect(addr0).releaseTokenForPropertyOwner(0)
            let receviedBalancesStruct = Object.assign({}, await VestingAdd.getAdminBalance(0, addr0.address))
            expect(receviedBalancesStruct.currentEstateTokenBal).to.equal(1000)
        })

        it("Should revert for re-release ", async function () {
            await network.provider.send("evm_increaseTime", [4800])
            await network.provider.send("evm_mine")
            await expect(VestingAdd.connect(addr0).releaseTokenForPropertyOwner(0)).to.be.revertedWith("Vesting : no token to release")
        })
    })

})



