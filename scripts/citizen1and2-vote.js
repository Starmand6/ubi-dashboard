const { randomBytes } = require("ethers/lib/utils");
const { ethers } = require("hardhat");

async function citizensvoting() {
    let ubiDash,
        //ubiToken,
        citizen1,
        citizen2,
        citizen1Calling,
        citizen2Calling,
        rando,
        randoCalling;
    const accounts = await ethers.getSigners();
    citizen1 = accounts[1];
    citizen2 = accounts[2];
    rando = accounts[7];
    ubiDash = await ethers.getContract("UBIDashboard");
    citizen1Calling = ubiDash.connect(citizen1);
    citizen2Calling = ubiDash.connect(citizen2);
    randoCalling = ubiDash.connect(rando);

    console.log("C1 and C2 voting.");
    await citizen1Calling.submitUBI(42);
    await citizen2Calling.submitUBI(84);
    await randoCalling.submitUBI(1); // transaction should fail.
}

citizensvoting()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

module.exports.tags = ["citizens-voting"];
