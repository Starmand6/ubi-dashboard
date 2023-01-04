const { ethers, network } = require("hardhat");
const FRONT_END_ADDRESSES_FILE = "../ubi-dashboard-frontend/constants/contractAddresses.json";
const FRONT_END_ABI_FILE = "../ubi-dashboard-frontend/constants/abi.json";
const fs = require("fs");

module.exports = async function () {
    if (process.env.UPDATE_FRONT_END) {
        console.log("Updating Front Endsies...");
        updateContractAddresses();
        updateAbi();
    }
};

async function updateContractAddresses() {
    const ubiDashContract = await deployments.get("UBIDashboard");
    const ubiTokenContract = await deployments.get("UBIToken");
    const ubiDash = await ethers.getContractAt(ubiDashContract.abi, ubiDashContract.address);
    const chainId = network.config.chainId.toString();
    const contractAddresses = JSON.parse(fs.readFileSync(FRONT_END_ADDRESSES_FILE, "utf8"));
    if (chainId in contractAddresses) {
        if (!contractAddresses[chainId].includes(ubiDash.address)) {
            contractAddresses[chainId].push(ubiDash.address);
        }
    } else {
        contractAddresses[chainId] = [ubiDash.address];
    }
    fs.writeFileSync(FRONT_END_ADDRESSES_FILE, JSON.stringify(contractAddresses));
}

async function updateAbi() {
    const ubiDashContract = await deployments.get("UBIDashboard");
    const ubiTokenContract = await deployments.get("UBIToken");
    const ubiDash = await ethers.getContractAt(ubiDashContract.abi, ubiDashContract.address);
    fs.writeFileSync(FRONT_END_ABI_FILE, ubiDash.interface.format(ethers.utils.FormatTypes.json));
}

module.exports.tags = ["all", "frontend"];
