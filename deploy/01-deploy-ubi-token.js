const { networkConfig, INITIAL_SUPPLY } = require("../helper-hardhat-config");
const { network } = require("hardhat");
const { verify } = require("../utils/verify");

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;
    let ubiToken;

    if (chainId == 31337) {
        console.log("Connected to local network. Deploying the UBI Token from:", deployer);
        ubiToken = await deploy("UBIToken", {
            contract: "UBIToken",
            from: deployer,
            log: true,
            args: [INITIAL_SUPPLY],
            waitConfirmations: network.config.blockConfirmations || 1,
        });
        console.log("UBIToken Deployed!");
        log("-----------------------------------------------");
    } else if (chainId == 5) {
        log("Connected to Ethereum Goerli Testnet. Deploying the UBI Token from:", deployer);
        ubiToken = await deploy("UBIToken", {
            from: deployer,
            log: true,
            args: [INITIAL_SUPPLY],
        });
        log("UBIToken Deployed!");
        log("-----------------------------------------------");
    } else if (chainId == 1) {
        log("Connected to Ethereum Mainnet. Deploying the UBI Token from:", deployer);
        ubiToken = await deploy("UBIToken", {
            from: deployer,
            log: true,
            args: [INITIAL_SUPPLY],
        });
        log("UBIToken Deployed!");
        log("-----------------------------------------------");
    }

    if (chainId != 31337 && process.env.POLYGONSCAN_API_KEY) {
        log("verifying contract...");
        await verify(ubiToken.address, [INITIAL_SUPPLY]);
        log("Contract verified!");
    }
};

module.exports.tags = ["deploy", "UBIToken"];
