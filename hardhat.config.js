require("@nomiclabs/hardhat-waffle");
require("hardhat-gas-reporter");
require("@nomiclabs/hardhat-etherscan");
require("hardhat-deploy");
require("solidity-coverage");
require("dotenv").config();

const POLYGON_MAINNET_RPC_URL = process.env.POLYGON_MAINNET_RPC_URL;
const COINMARKETCAP_API_KEY = process.env.COINMARKETCAP_API_KEY;
const POLYGON_MUMBAI_RPC_URL = process.env.POLYGON_MUMBAI_RPC_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY;
const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
const GOERLI_RPC_URL = process.env.GOERLI_RPC_URL;
const MAINNET_RPC_URL = process.env.MAINNET_RPC_URL || process.env.ALCHEMY_MAINNET_RPC_URL;
const mnemonic = process.env.mnemonic;

module.exports = {
    defaultNetwork: "hardhat",
    networks: {
        hardhat: {
            chainId: 31337,
            forking: {
                url: POLYGON_MAINNET_RPC_URL,
                blockNumber: 36470408,
            },
        },
        localhost: {
            url: "http://127.0.0.1:8454/",
            chainId: 31337,
            blockNumber: 36470408,
        },
        // Eth Mainnet
        /* Mainnet: {
      url: MAINNET_RPC_URL,
      accounts: [PRIVATE_KEY], // Change to Mainnet deployment wallet private key.
      chainId: 1,
      blockConfirmations: 6
    },*/
    },
    solidity: { compilers: [{ version: "0.8.17" }, { version: "0.4.16" }, { version: "0.5.17" }] },
    etherscan: {
        apikey: "",
    },
    gasReporter: {
        enabled: true,
        currency: "USD",
        outputFile: "gas-report.txt",
        noColors: false,
        coinmarketcap: COINMARKETCAP_API_KEY,
        // gasPriceApi: "https://api.polygonscan.com/api?module=proxy&action=eth_gasPrice",
        // Eth is default base currency.
        token: "MATIC",
    },
    namedAccounts: {
        deployer: {
            default: 0,
            1: 0,
        },
    },
    mocha: {
        timeout: 500000,
    },
};
