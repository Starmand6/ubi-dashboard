const { assert, expect } = require("chai");
const { ethers, deployments, network } = require("hardhat");
const {
    networkConfig,
    INITIAL_SUPPLY,
    INITIAL_UBI_PAYMENT,
} = require("../../helper-hardhat-config");
const { utils } = require("ethers");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

if ((chainId = 31337)) {
    describe.skip("UBI Token Unit Testing", function () {
        let ubiDash, ubiToken, accounts, deployer, citizen1, citizen2;

        beforeEach(async function () {
            accounts = await ethers.getSigners();
            deployer = accounts[0];
            citizen1 = accounts[1];
            citizen2 = accounts[2];

            await deployments.fixture(["deploy"]);
            const ubiDashContract = await deployments.get("UBIDashboard");
            const ubiTokenContract = await deployments.get("UBIToken");
            ubiDash = await ethers.getContractAt(ubiDashContract.abi, ubiDashContract.address);
            ubiToken = await ethers.getContractAt(ubiTokenContract.abi, ubiTokenContract.address);
            await ubiToken.payUBI(citizen1.address);
        });
        describe("Constructor", function () {
            it("mints 1000 UBI to owner", async function () {
                const deployerBalance = await ubiToken.balanceOf(deployer.address);
                assert.equal(deployerBalance.toString(), INITIAL_SUPPLY);
            });
        });
        describe("Paying UBI", function () {
            it("mints correct amount of tokens to user", async function () {
                const citizen1Balance = await ubiToken.balanceOf(citizen1.address);
                assert.equal(citizen1Balance.toString(), INITIAL_UBI_PAYMENT);
            });
        });
        describe("Issuance Halving", function () {
            it("halves UBI payments after 2 years", async function () {
                console.log(await time.latest());
                // Advancing timestamp: 1670276179 + 631720000,
                // 2 years + 1 million seconds for funsies/lagniappe
                const newTimeStamp = 2302447619;
                await time.increaseTo(newTimeStamp);
                await ubiToken.payUBI(citizen2.address);
                console.log(await ubiToken.startingTimeStamp());

                const citizen2Balance = await ubiToken.balanceOf(citizen2.address);
                assert.equal(citizen2Balance.toString(), INITIAL_UBI_PAYMENT / 2);
            });
        });
    });
}
