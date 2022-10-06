const { ethers, upgrades } = require('hardhat')

async function main() {
    const [deployer] = await ethers.getSigners()

    console.log(`Deploying Vesting contract with the account: ${deployer.address}`)

    const Vesting = await ethers.getContractFactory('Vesting')
    console.log('Deploying Vesting...')
    const vesting = await upgrades.deployProxy(Vesting, [
        "0x80cB2A6D105178A426447f36bD91a2749c8B6b60",
        "0x651dF973D62d501621Ca2076a1823f083B06F5d1",
        "0xc69E7C13A3AD6c9cd84aaa6fcA4Fa4074B232038",
        "0x2C9303d0Fbb8F12CBe9dF0e7eaa00782d0b5f4D2"
        // "0x3C36fd52f22256e4dF32779D471Eb0fAd2EEe385"
    ],
    { initializer: 'Initialize' });
    await vesting.deployed()
    console.log('Vesting deployed to:', vesting.address)
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
