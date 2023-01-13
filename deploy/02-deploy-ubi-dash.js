const { networkConfig } = require("../helper-hardhat-config");
const { network } = require("hardhat");
const { verify } = require("../utils/verify");
const chainId = network.config.chainId;
// const cityDAOCitizenNFTAddress = networkConfig[chainId]["cityDAOCitizenNFTContract"];
// const PoHContract = networkConfig[chainId]["PoHContract"];

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    let ubiDash, ubiToken, ubiTokenAddress;

    if (chainId == 31337) {
        ubiToken = await deployments.get("UBIToken");
        ubiTokenAddress = ubiToken.address;
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
    } else if (chainId == 5) {
        ubiToken = await deployments.get("UBIToken");
        ubiTokenAddress = ubiToken.address;
        log("Connected to Ethereum Goerli Testnet. Deploying UBI Dashboard...");
        ubiDash = await deploy("UBIDashboard", {
            from: deployer,
            log: true,
            args: [/*cityDAOCitizenNFTAddress,*/ ubiTokenAddress /*PoHContract*/],
        });
        log("UBIDashboard Deployed!");
        log("-----------------------------------------------------------");
    } else if (chainId == 1) {
        ubiToken = await deployments.get("UBIToken");
        ubiTokenAddress = ubiToken.address;
        log("Connected to Ethereum Mainnet. Deploying UBI Dashboard...");
        ubiDash = await deploy("UBIDashboard", {
            from: deployer,
            log: true,
            args: [/*cityDAOCitizenNFTAddress,*/ ubiTokenAddress /*PoHContract*/],
        });
        log("UBIDashboard Deployed!");
        log("-----------------------------------------------------------");
    }

    if (chainId != 31337 && process.env.ETHERSCAN_API_KEY) {
        log("verifying contract...");
        await verify(ubiDash.address, [ubiToken.address]);
        log("Contract verified!");
    }
};

module.exports.tags = ["deploy", "UBIDashboard"];
