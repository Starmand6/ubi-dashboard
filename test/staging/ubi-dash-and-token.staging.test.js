const { assert, expect } = require("chai");
const { ethers, network } = require("hardhat");
const { utils } = require("ethers");
const { INITIAL_UBI_PAYMENT } = require("../../helper-hardhat-config");
const chainId = network.config.chainId;

if (chainId == 5) {
    // The UBI round gating makes staging testing quite hard. I had to test each "it"
    // statement by itself to get any progress done. But given a clean slate, this
    // shouuuuulllld all pass in one run. I need to learn how to make better staging tests.
    describe("Staging Tests", function () {
        let ubiDash,
            ubiToken,
            citizen1,
            citizen2,
            rando,
            citizen1Calling,
            citizen2Calling,
            randoCalling;
        beforeEach(async function () {
            // Having some dependency troubles with Hardhat not recognizing addresses
            // from getSigners / getNamedAccounts, so may need to hardcode accounts
            // of your choosing
            // Make sure each wallet has at least 0.2 eth.
            // citizen1 = "0xe9121d54137404e64Dee9F8A7c19307e4df5E9fa";
            // citizen2 = "0x905e7040310040cbBfbEdD79FA80148cda5a46F0";
            // rando = "0xb55e232987a1BF0ec3E8142C14CF32F3aF78DaB0";
            const accounts = await ethers.getSigners();
            citizen1 = accounts[1];
            citizen2 = accounts[2];
            rando = accounts[7];
            ubiDash = await ethers.getContract("UBIDashboard");
            ubiToken = await ethers.getContract("UBIToken");
            citizen1Calling = ubiDash.connect(citizen1);
            citizen2Calling = ubiDash.connect(citizen2);
            randoCalling = ubiDash.connect(rando);
        });
        describe("UBI Dashboard Staging Tests", function () {
            // Registrations passed.
            it("registers users properly", async function () {
                console.log("Users are registering.");
                await citizen1Calling.register();
                const [, , , , inGoodStanding] = await ubiDash.walletToCitizenUBIData(citizen1);
                // You have to vote at least once to be in good standing.
                assert.equal(inGoodStanding, false);
                await citizen2Calling.register();
                expect(await ubiDash.registeredCitizens(citizen1)).to.be.true;
            });
            it("does not let unregistered people submit UBI", async function () {
                console.log("Unregistered user is trying to submit UBI.");
                await expect(randoCalling.submitUBI(42)).to.be.revertedWith(
                    "MustBeRegisteredCitizen"
                );
            });
            it("proceeds through an entire UBI round and records data correctly", async function () {
                await citizen1Calling.openRound();
                console.log("UBI Round has opened.");
                await citizen1Calling.submitUBI(42);
                const subtx = await citizen2Calling.submitUBI(84);
                await subtx.wait(1);
                const closetx = await citizen1Calling.closeRound();
                await closetx.wait(1);
                console.log("UBI Round has closed.");
                const [, , , , , votedPrevousRound] = await ubiDash.walletToCitizenUBIData(
                    citizen1.address
                );
                assert.equal(votedPrevousRound, true);
                const avgDCWScore = await ubiDash.getTotalAVGDCWThisRound();
                assert.equal(avgDCWScore, 63);
            });
            it("allows user to withdraw correct amount of UBI and participate in UBI again", async function () {
                console.log("Citizen 2 is withdrawning.");
                const withdrawtx = await citizen2Calling.withdrawUBI();
                await withdrawtx.wait(1);
                const balance = (await ubiToken.balanceOf(citizen2.address)) / 1e18;
                assert.equal(balance, 1000);
                const opentx = await citizen1Calling.openRound();
                await opentx.wait(1);
                await expect(citizen2Calling.submitUBI(99)).to.not.be.reverted;
            });
        });
        describe("UBI Token Staging Tests", function () {
            let citizen1CallingToken, citizen1CallingDash;
            beforeEach(async function () {
                citizen1CallingToken = ubiToken.connect(citizen1);
                citizen1CallingDash = ubiDash.connect(citizen1);
            });
            it("citizen1 cannot call pay/mint function", async function () {
                await expect(citizen1CallingToken.payUBI(citizen1.address)).to.be.revertedWith(
                    "Ownable: caller is not the owner"
                );
            });
            it("mints and transfers correct amount of tokens to user", async function () {
                // Citizen1 needs to withdraw before voting again.
                const withdrawtx1 = await citizen1CallingDash.withdrawUBI();
                await withdrawtx1.wait(1);
                const citizen1BalanceBefore = (await ubiToken.balanceOf(citizen1.address)) / 1e18;
                const subtx = await citizen1CallingDash.submitUBI(42);
                await subtx.wait(1);
                const closetx = await citizen1CallingDash.closeRound();
                await closetx.wait(1);
                const withdrawtx2 = await citizen1CallingDash.withdrawUBI();
                await withdrawtx2.wait(1);
                const citizen1BalanceAfter = (await ubiToken.balanceOf(citizen1.address)) / 1e18;
                assert.equal(
                    citizen1BalanceAfter - citizen1BalanceBefore,
                    INITIAL_UBI_PAYMENT / 1e18
                );
            });
            it("can transfer UBI to another address", async function () {
                const citizen2BalanceBefore = (await ubiToken.balanceOf(citizen2.address)) / 1e18;
                const transfertx = await citizen1CallingToken.transfer(
                    citizen2.address,
                    utils.parseEther("500")
                );
                await transfertx.wait(1);
                const citizen2BalanceAfter = (await ubiToken.balanceOf(citizen2.address)) / 1e18;
                assert.equal(citizen2BalanceAfter - citizen2BalanceBefore, 500);
            });
        });
    });
}
