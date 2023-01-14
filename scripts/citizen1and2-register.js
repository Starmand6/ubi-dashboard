const { ethers } = require("hardhat");

async function citizensregistering() {
    let ubiDash,
        //ubiToken,
        citizen1,
        citizen2,
        citizen1Calling,
        citizen2Calling;
    const accounts = await ethers.getSigners();
    citizen1 = accounts[1];
    citizen2 = accounts[2];
    ubiDash = await ethers.getContract("UBIDashboard");
    citizen1Calling = ubiDash.connect(citizen1);
    citizen2Calling = ubiDash.connect(citizen2);

    console.log("C1 and C2 Registering.");
    await citizen1Calling.register();
    await citizen2Calling.register();
}

citizensregistering()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });

module.exports.tags = ["citizens-registering"];
