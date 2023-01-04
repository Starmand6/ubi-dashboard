const { assert, expect } = require("chai");
const { ethers, deployments, network } = require("hardhat");
const { networkConfig } = require("../../helper-hardhat-config");
const { utils, BigNumber } = require("ethers");
const chainId = network.config.chainId;
const { time } = require("@nomicfoundation/hardhat-network-helpers");

if (chainId == 31337) {
    describe("UBI Dashboard Unit Testing", function () {
        let ubiDash,
            ubiToken,
            accounts,
            deployer,
            citizen1,
            citizen2,
            citizen1Calling,
            citizen2Calling,
            randoCalling,
            ubiDashSigner;

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
            // TODO: Create script and test it and include here.
            await ubiToken.transferOwnership(ubiDash.address);
            // ubiDashSigner = await ethers.getSigner(ubiDash.address);
            // await ubiToken.transferOwnership(citizen2.address);
            // await ubiToken.connect(citizen2.address).payUBI(citizen1.address);
            //ubiToken.connect(ubiDashSigner);
        });
        // All constructor tests pass
        describe("Constructor", function () {
            it("initializes contract objects correctly", async function () {
                // const cityDAONFT = await ubiDash.i_cityDAOCitizenNFT();
                // assert.equal(cityDAONFT, networkConfig[chainId]["cityDAOCitizenNFTContract"]);
                const ubiTokenAddress = await ubiDash.getUBITokenAddress();
                assert.equal(ubiToken.address, ubiTokenAddress);
                // const PoHAddress = await ubiDash.i_PoH();
                // assert.equal(PoHAddress, networkConfig[chainId]["PoHContract"]);
            });
        });
        // All non-skipped Registration tests are passing.
        describe("Registration", function () {
            beforeEach(async function () {
                citizen1Calling = await ubiDash.connect(citizen1);
            });
            it("reverts if citizen is already registered", async function () {
                await citizen1Calling.register();
                await expect(citizen1Calling.register()).to.be.revertedWith("AlreadyRegistered");
            });
            // Tests are run with the POH, POE, and Citizen NFT checks commented out in UBIDashboard.sol,
            // since no testnet wallets will have them. Including them here for posterity's sake.
            it.skip("reverts if user fails Proof of Humanity or Proof of Existence", async function () {
                await expect(citizen1Calling.register()).to.be.revertedWith("MustBeVerifiedHuman");
            });

            it.skip("reverts if wallet does not hold Citizen NFT", async function () {
                await expect(citizen1Calling.register()).to.be.revertedWith("AlreadyRegistered");
            });
            it("adds user to mappings correctly", async function () {
                await citizen1Calling.register();
                const [progress, , , , ,] = await ubiDash.walletToCitizenUBIData(citizen1.address);
                // Since "HasNotSubmittedUBI" is the starting Enum position, it should be equal to "0".
                assert.equal(progress, 0);
                expect(await ubiDash.registeredCitizens(citizen1.address)).to.be.true;
            });
            it("emits registration event", async function () {
                await expect(citizen1Calling.register()).to.emit(ubiDash, "CitizenHasRegistered");
            });
        });
        // All Between Rounds tests pass
        describe("Between Rounds", function () {
            it("closeRound() cannot be called", async function () {
                await expect(ubiDash.closeRound()).to.be.revertedWith(
                    "UBIRoundHasAlreadyBeenClosed"
                );
            });
            it("submitUBI() cannot be called", async function () {
                await ubiDash.register();
                await expect(ubiDash.submitUBI(42)).to.be.revertedWith(
                    "UBIRoundHasAlreadyBeenClosed"
                );
            });
        });
        // All passing
        describe("Round Open", function () {
            beforeEach(async function () {
                await citizen1Calling.register();
                citizen2Calling = await ubiDash.connect(citizen2);
                await citizen2Calling.register();
            });
            it("does not work when round has already been opened", async function () {
                await ubiDash.openRound();
                await expect(ubiDash.openRound()).to.be.revertedWith("UBIRoundIsAlreadyOpen");
            });
            it("resets all round variables and updates round #", async function () {
                await ubiDash.openRound();
                const hasVoted = await ubiDash.getWhoHasVotedThisRound();
                assert.equal(hasVoted.length, 0);
                const roundNumber = await ubiDash.ubiRoundNumber();
                assert.equal(roundNumber, 1);
                const avgDCW = await ubiDash.getTotalAVGDCWThisRound();
                assert.equal(avgDCW, 0);
                const totalUBI = await ubiDash.totalUBIThisRound();
                assert.equal(totalUBI, 0);
            });
            it("sets close time for 13.5 days in future", async function () {
                await ubiDash.openRound();
                // Advancing time 2 hours
                await time.increase(7200);
                await expect(ubiDash.closeRound()).to.be.revertedWith("TooEarlyToCloseRound");
                console.log(await time.latest());
                // Advancing time a little past 13 days and 10 hours
                await time.increase(1165000);
                console.log(await time.latest());
                await expect(ubiDash.closeRound()).to.not.be.reverted;
            });
            it("emits an event that returns UBI Round Open Time", async function () {
                await expect(ubiDash.openRound()).to.emit(ubiDash, "UBIRoundHasOpened");
            });
            describe("Submit UBI", function () {
                beforeEach(async function () {
                    await ubiDash.openRound();
                    citizen1Calling.submitUBI(42);
                });
                // Placeholders:
                // it("reverts if Proof of Humanity verification is unsuccessful", async function () {});
                // it("reverts if wallet does not hold Citizen NFT", async function () {});

                // Submiting UBI when round is not open is tested elsewhere.

                it("reverts if welfare score entry is not valid", async function () {
                    await expect(citizen2Calling.submitUBI(102)).to.be.revertedWith(
                        "ScoreMustBeBetween0and100"
                    );
                });
                it("reverts if user has already voted", async function () {
                    await expect(citizen1Calling.submitUBI(42)).to.be.revertedWith(
                        "WithdrawFirstORAlreadySubmitted"
                    );
                });
                it("sets first UBI submittal round correctly", async function () {
                    const [, , citizen1FirstRound, , ,] = await ubiDash.walletToCitizenUBIData(
                        citizen1.address
                    );
                    assert.equal(citizen1FirstRound, 1);
                });
                it("updates UBI counter correctly", async function () {
                    const [, citizen1UBICounter, , , , ,] = await ubiDash.walletToCitizenUBIData(
                        citizen1.address
                    );
                    assert.equal(citizen1UBICounter, 1);
                });
                it("updates UBI percentage correctly and pushed to votedThisRound array", async function () {
                    const [, , , citizen1UBIPercentage, , ,] = await ubiDash.walletToCitizenUBIData(
                        citizen1.address
                    );
                    assert.equal(citizen1UBIPercentage, 100);
                    expect(await ubiDash.getWhoHasVotedThisRound()).to.include(citizen1.address);
                });
                it("gets UBI stats distributed for this round and ever", async function () {
                    const [, , , totalUBIRound, totalUBIEver] = await ubiDash.getUBIStats();
                    assert.equal(totalUBIRound, 1000);
                    assert.equal(totalUBIEver, 1000);
                });
                it("updates UBI inGoodStanding correctly", async function () {
                    const [, , , , inGoodStanding] = await ubiDash.walletToCitizenUBIData(
                        citizen1.address
                    );
                    assert.equal(inGoodStanding, true);
                });
                it("calculates and updates avg. DCW score correctly", async function () {
                    const avgDCWScore = await ubiDash.getTotalAVGDCWThisRound();
                    assert.equal(avgDCWScore, 42);
                });
                // it("calls database correctly", async function () {});
                it("emits CitizenHasVoted event when user has submitted", async function () {
                    await expect(citizen2Calling.submitUBI(84)).to.emit(ubiDash, "CitizenHasVoted");
                });
                describe("Round Close", function () {
                    beforeEach(async function () {
                        citizen2Calling.submitUBI(84);
                    });

                    // An early closeRound() call and a closeRound() call when the round is
                    // already closed are included in the "Round Open" tests. Both revert as expected.

                    it("emits an UBIRoundHasClosed event", async function () {
                        console.log(Date.now());
                        await time.increase(1166400); // 13.5 days worth of seconds
                        await expect(ubiDash.closeRound()).to.emit(ubiDash, "UBIRoundHasClosed");
                    });

                    // This has already been tested in the "Between Rounds" tests, but in case
                    // the closeRound call changes something unexpectedly.
                    it("user cannot submit UBI after round close", async function () {
                        await time.increase(1166400);
                        await ubiDash.closeRound();
                        await expect(ubiDash.submitUBI(42)).to.be.revertedWith(
                            "UBIRoundHasAlreadyBeenClosed"
                        );
                    });
                    describe("Withdrawing UBI", function () {
                        beforeEach(async function () {
                            await time.increase(1166400);
                            await ubiDash.closeRound();
                            randoCalling = ubiDash.connect(accounts[10]);
                        });
                        // POE, POH, and NFT checks can be retested here.
                        it("reverts if user is not a registered citizen", async function () {
                            await expect(randoCalling.withdrawUBI()).to.be.revertedWith(
                                "MustBeRegisteredCitizen"
                            );
                        });
                        it("reverts if user has already claimed UBI payment", async function () {
                            citizen1Calling.withdrawUBI();
                            await expect(citizen1Calling.withdrawUBI()).to.be.revertedWith(
                                "AlreadyClaimedUBIPayment"
                            );
                        });
                        it("reverts if user has not submitted UBI", async function () {
                            await randoCalling.register();
                            await expect(randoCalling.withdrawUBI()).to.be.revertedWith(
                                "MustSubmitUBIBeforePayment"
                            );
                        });
                        it("changes voted and paid statuses", async function () {
                            await citizen2Calling.withdrawUBI();
                            const [progress, , , , , previous] =
                                await ubiDash.walletToCitizenUBIData(citizen2.address);
                            assert.equal(progress, 2);
                            assert.equal(previous, false);
                        });
                        it("pays user correct payment in UBI token", async function () {
                            await citizen2Calling.withdrawUBI();
                            const balance = await ubiToken.balanceOf(citizen2.address);
                            assert.equal(balance, 1000);
                        });
                        it("emits a 'CitizenHasBeenPaid' event", async function () {
                            const payment = await ubiToken.ubiPayment;
                            await expect(citizen2Calling.withdrawUBI())
                                .to.emit(ubiDash, "CitizenHasBeenPaid")
                                .withArgs(citizen2.address, payment);
                        });
                        // The only getter functions/parameters not tested yet are below:
                        describe("Human-Readable Getters", function () {
                            it("gets correctly calculated UBI percentage", async function () {
                                await ubiDash.openRound();
                                await time.increase(1166400);
                                await ubiDash.closeRound();
                                const citizen2percentage = await ubiDash.getCitizenUBIPercentage(
                                    citizen2.address
                                );
                                assert.equal(citizen2percentage, 50);
                            });
                            // it("gets UBI round times", async function () {
                            //     await ubiDash.openRound();
                            //     const opentime = Math.floor(new Date().getTime() / 1000);
                            //     const closetime = opentime + 1166400000;
                            //     const nextopentime = closetime + 43200000;
                            //     const [, roundopen, roundclose, , , nextopen] =
                            //         await ubiDash.getUBIStats();
                            //     console.log(opentime, BigNumber.from("roundopen"));
                            //     // This assertion test is not recommended, but since we are testing
                            //     // time, and there will be slippage due to different machine clocks,
                            //     // this is adequate for a portfolio tester.
                            //     expect(opentime).to.be.closeTo(roundopen, 2000000); // about 33 minutes
                            //     expect(closetime).to.be.closeTo(roundclose, 2000000);
                            //     expect(nextopentime).to.be.closeTo(nextopen, 2000000);
                            //     //assert.equal(closetime, roundclose);
                            //     //assert.equal(nextopentime, nextopen);
                            // });
                        });
                    });
                });
            });
        });
    });
}

// describe("Dashboard Access", function () {
//     beforeEach(async function () {
//         const citizen1 = await ubiDash.connect(accounts[1]);
//     });
//     it("reverts if Proof of Humanity verification is unsuccessful", async function () {});
//     it("reverts if wallet does not hold Citizen NFT", async function () {});
//     it("reverts and sends an already voted error", async function () {});
// });
//   describe("Member Information Section", function () {
//             it("reverts if user has not completed DAO knowledge Section", async function () {});
//             it("reverts if user has already submitted information", async function () {});
//             it("records members information correctly", async function () {});

//             it("changes enum to proposal status", async function () {});
// describe("Proposal Section", function () {
//     it("reverts if user has not completed Member Info Section", async function () {});
//     it("reverts if user has already voted", async function () {});
//     it("records member votes correctly", async function () {});

// });
