const { networkConfig } = require("../helper-hardhat-config");
const { network } = require("hardhat");
const { verify } = require("../utils/verify");

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;
    let ubiToken;
    const INITIAL_SUPPLY = 1000;

    if (chainId == 31337) {
        // mock
        console.log("Connected to Local network. Deploying the UBI Token from:", deployer);
        ubiToken = await deploy("UBIToken", {
            contract: "UBIToken",
            from: deployer,
            log: true,
            args: [INITIAL_SUPPLY],
            waitConfirmations: network.config.blockConfirmations || 1,
        });
        console.log("The UBI Token has been deployed!");
        log("-----------------------------------------------");
    }

    if (chainId != 31337 && process.env.POLYGONSCAN_API_KEY) {
        log("verifying contract...");
        await verify(ubiToken.address);
    }
};

module.exports.tags = ["deploy", "UBIToken"];
