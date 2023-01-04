const { networkConfig } = require("../helper-hardhat-config");
const { network } = require("hardhat");
const { verify } = require("../utils/verify");
const chainId = network.config.chainId;
// const cityDAOCitizenNFTAddress = networkConfig[chainId]["cityDAOCitizenNFTContract"];
// const PoHContract = networkConfig[chainId]["PoHContract"];

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    let ubiDash;

    if (chainId == 31337) {
        // mock
        const ubiToken = await deployments.get("UBIToken");
        const ubiTokenAddress = ubiToken.address;
        console.log("Connected to Local network. Deploying the UBI Dashboard from:", deployer);
        ubiDash = await deploy("UBIDashboard", {
            contract: "UBIDashboard",
            from: deployer,
            log: true,
            args: [/*cityDAOCitizenNFTAddress,*/ ubiTokenAddress /*PoHContract*/],
            waitConfirmations: network.config.blockConfirmations || 1,
        });
        console.log("The UBI Dashboard has been deployed!");
        log("-----------------------------------------------");
    }

    if (chainId != 31337 && process.env.POLYGONSCAN_API_KEY) {
        log("verifying contract...");
        await verify(ubiDash.address);
    }
};

module.exports.tags = ["deploy", "UBIDashboard"];
