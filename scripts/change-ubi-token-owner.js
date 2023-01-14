const { ethers } = require("hardhat");

async function changeUBITokenOwner() {
    const ubiDash = await ethers.getContract("UBIDashboard");
    const ubiToken = await ethers.getContract("UBIToken");
    console.log("Transferring ownership to the UBI Dashboard contract.");
    await ubiToken.transferOwnership(ubiDash.address);
}

changeUBITokenOwner()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

module.exports.tags = ["changeOwner"];
