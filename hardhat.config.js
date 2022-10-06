// require("dotenv").config();

// require('@openzeppelin/hardhat-upgrades');
// require("@nomiclabs/hardhat-etherscan");
// require("@nomiclabs/hardhat-waffle");
// require("hardhat-gas-reporter");
// require("solidity-coverage");
// require("hardhat-gas-reporter");

// let polygonscan_api_key = `${process.env.POLYGONSCAN_API_KEY}`;
// let polygon_alchemy_key = process.env.POLYGON_ALCHEMY_KEY;

// // console.log(`POLYGONSCAN_API_KEY: ${polygonscan_api_key}`);
// // console.log(`POLYGON_ALCHEMY_KEY: ${polygon_alchemy_key}`);

// // This is a sample Hardhat task. To learn how to create your own go to
// // https://hardhat.org/guides/create-task.html
// task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
//   const accounts = await hre.ethers.getSigners();

//   for (const account of accounts) {
//     console.log(account.address);
//   }
// });

// // You need to export an object to set up your config
// // Go to https://hardhat.org/config/ to learn more

// /**
//  * @type import('hardhat/config').HardhatUserConfig
//  */
// module.exports = {
//   solidity: {
//     version: "0.8.4",
//     settings: {
//       optimizer: {
//         enabled: true,
//         runs: 20,
//       },
//     },
//     networks: {
//       // ropsten: {
//       //   url: process.env.ROPSTEN_URL,
//       //   accounts:
//       //     process.env.PRIVATE_KEY,
//       // },
//       matic: {
//         url:"https://rpc-mumbai.maticvigil.com",
//         accounts: [process.env.PRIVATE_KEY]
//       },

//     },
//     etherscan: {
//       apiKey: polygonscan_api_key,
//     },
//   }
// };

require('@nomiclabs/hardhat-waffle');
require('@nomiclabs/hardhat-etherscan');
require('@openzeppelin/hardhat-upgrades');
require('@nomiclabs/hardhat-ethers');
require('@nomiclabs/hardhat-web3');
require('hardhat-gas-reporter');
require('dotenv').config();

module.exports = {
  solidity: {
    version: '0.8.2',
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000,
      },
    },
  },
  networks: {
    hardhat: {},
    matic: {
      url: process.env.MATIC_TESTNET_RPC_URL,
      accounts: [process.env.CONTRACT_DEPLOYER_PRIVATE_KEY],
      networkCheckTimeout: 999999,
    },
    //   rinkby: {
    //     url: process.env.RINKEBY_URL,
    //           accounts: [process.env.CONTRACT_DEPLOYER_PRIVATE_KEY]
  },
  etherscan: {
    apiKey: process.env.POLYGONSCAN_API_KEY,
  },
};
