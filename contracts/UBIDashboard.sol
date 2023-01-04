// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

// If using Proof of Existence for personhood verification,
// import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./UBIToken.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";
import "hardhat/console.sol";

interface IProofOfHumanity {
    /** @dev Return true if the submission is registered and not expired.
     *  @param _submissionID The address of the submission.
     *  @return Whether the submission is registered or not.
     */
    function isRegistered(address _submissionID) external view returns (bool);
}

contract UBIDashboard is Ownable {
    struct CitizenData {
        UBIProgress progress;
        uint16 ubiCounter;
        uint16 firstUBIRoundVoted;
        uint8 ubiPercentage;
        bool inGoodStanding;
        bool votedPreviousRound;
    }

    // Enum keeps track of what stage each citizen is at
    enum UBIProgress {
        HasNotSubmittedUBI,
        HasSubmittedUBI,
        HasBeenPaid
    }

    /// Interfaces
    // IERC1155 public immutable i_cityDAOCitizenNFT;
    UBIToken public immutable i_ubiToken;
    // IProofOfHumanity public i_PoH;

    /// Mappings and Variables
    mapping(address => bool) public registeredCitizens;
    mapping(address => CitizenData) public walletToCitizenUBIData;

    /// State Variables
    address[] public votedThisRound;
    // address[] public hasBeenPaid;
    uint256 currentUBIAmount;
    uint256 public totalUBIThisRound;
    uint256 public totalUBIEver;
    uint256 public ubiRoundOpenTime;
    uint256 public ubiRoundCloseTime;
    uint32 public avgDCWThisRound;
    uint16 public ubiRoundNumber;
    bool ubiRoundIsOpen;

    /// Events
    event CitizenHasRegistered(address);
    event UBIRoundHasOpened(uint256, uint256);
    event CitizenHasVoted();
    event UBIRoundHasClosed(uint256, uint32);
    event CitizenHasBeenPaid(address, uint256);

    /// Errors
    error AlreadyRegistered();
    error MustBeVerifiedHuman();
    error MustHoldCitizenNFT(string, address);
    error MustBeRegisteredCitizen();
    error UBIRoundIsAlreadyOpen();
    error TooEarlyToCloseRound();
    error UBIRoundHasAlreadyBeenClosed();
    error ScoreMustBeBetween0and100();
    error WithdrawFirstORAlreadySubmitted();
    error MustSubmitUBIBeforePayment();
    error AlreadyClaimedUBIPayment();
    error MustBeInGoodStandingToReceiveUBI();

    constructor(/*address _cityDAOCitizenNFTContract*/ address _ubiToken /*address _PoH*/) {
        // Chainlink keeper
        // i_cityDAOCitizenNFT = IERC1155(_cityDAOCitizenNFTContract);
        i_ubiToken = UBIToken(_ubiToken);
        // i_PoH = IProofOfHumanity(_PoH);
    }

    receive() external payable {}

    fallback() external payable {}

    /// Citizen Registration
    function register() external {
        // Does not let user register twice
        if (registeredCitizens[msg.sender]) {
            revert AlreadyRegistered();
        }

        // Proof of Humanity check is commented out so that this entire contract can be interacted with by anyone.
        // Proof of Humanity IDs can be obtained here: https://www.proofofhumanity.id/
        // if (!i_PoH.isRegistered(msg.sender)) {
        //     revert MustBeVerifiedHuman();
        // }

        // Alternate one-person-one-vote option: Governer DAO's Proof of Existence check is commented out so that
        // this entire contract can be interacted with by anyone.
        // require(IERC20(0x5945bAF9272e0808165aDea61b932eC1604FB161).balanceOf(msg.sender) == 1,
        // "Need to authenticate first by obtaining your Proof of Existence Token at https://onlyoneme.governordao.org/!");

        // CityDAO Citizen NFT check is commented out so that this entire contract can be interacted with by anyone.
        /// @dev Verifying wallet has CityDAO Citizen NFT. ID is 42, obtained from smart contract
        /// at: https://github.com/citydaoproject/citydao-citizens/blob/master/src/CitizenNFT.sol
        // if (i_cityDAOCitizenNFT.balanceOf(msg.sender, 42) == 0) {
        //     revert MustHoldCitizenNFT(
        //         "CityDAO Citizen NFT Contract Address: ",
        //         address(i_cityDAOCitizenNFT)
        //     );
        // }

        walletToCitizenUBIData[msg.sender] = CitizenData(
            UBIProgress.HasNotSubmittedUBI,
            0,
            0,
            0,
            false,
            false
        );

        registeredCitizens[msg.sender] = true;
        emit CitizenHasRegistered(msg.sender);
    }

    // Chainlink time keeper function to start and stop UBI round. Then use DateTime to get times.
    // Use parseTimestamp(timestamp) to get date-times within this function;
    // When round closes, add an event that submits the rounds total avg DCW score.
    // User can withdraw/claim at any time, inside or outside any UBI round.
    // OnlyChainlink modifier
    function openRound() external onlyOwner {
        if (ubiRoundIsOpen == true) {
            revert UBIRoundIsAlreadyOpen();
        }

        /// @notice We reset round variables to fresh states. (As Dave Grohl says, "Fresh POOOTS!")
        delete votedThisRound;
        ubiRoundIsOpen = true;
        ubiRoundNumber++;
        ubiRoundOpenTime = block.timestamp;
        avgDCWThisRound = 0;
        totalUBIThisRound = 0;
        // Twelve hours between rounds to allow for updating, maintenance, etc.
        ubiRoundCloseTime = ubiRoundOpenTime + 13 days + 12 hours;
        // console.log("Round Open:", ubiRoundOpenTime);
        // console.log("Round Close:", ubiRoundCloseTime);
        emit UBIRoundHasOpened(ubiRoundOpenTime, ubiRoundCloseTime);
    }

    /** @dev All Proof of Personhood and Citizen Token checks can be duplicated here, to ensure
     *  that all DAO members/citizens keep current with their identifications and as an
     *  anti-shenanigans measure.
     *  @notice Requires registration, knowledge quizzes, survey, and voting completion.
     */
    // For portfolio purposes, citizens will only answer one question and submit their
    // DAO Collective Welfare Score with this function. The nuts and bolts are all there.
    // Could add functionality to save each members dcwScore so they can look back on it.
    function submitUBI(uint32 dcwScore) external {
        if (ubiRoundIsOpen == false) {
            revert UBIRoundHasAlreadyBeenClosed();
        }
        if (dcwScore > 100 || dcwScore < 0) {
            revert ScoreMustBeBetween0and100();
        }

        if (!registeredCitizens[msg.sender]) {
            revert MustBeRegisteredCitizen();
        }
        if (
            walletToCitizenUBIData[msg.sender].votedPreviousRound == true ||
            walletToCitizenUBIData[msg.sender].progress == UBIProgress.HasSubmittedUBI
        ) {
            revert WithdrawFirstORAlreadySubmitted();
        } else {
            // Updating Citizen and control variables.
            if (walletToCitizenUBIData[msg.sender].firstUBIRoundVoted == 0) {
                walletToCitizenUBIData[msg.sender].firstUBIRoundVoted = ubiRoundNumber;
            }
            walletToCitizenUBIData[msg.sender].ubiCounter++;
            walletToCitizenUBIData[msg.sender].progress = UBIProgress.HasSubmittedUBI;
            // This boolean needs to be set here at user touchpoint, but will be used
            // during the next round when user withdraws. This eliminates the need for
            // a for loop to reset things. We also need to avoid fractions below 1,
            // so we are multiplying by 100 before dividing.
            walletToCitizenUBIData[msg.sender].votedPreviousRound = true;
            // Add 1 since the first round a person votes should be counted.
            walletToCitizenUBIData[msg.sender].ubiPercentage = uint8(
                ((walletToCitizenUBIData[msg.sender].ubiCounter * 100) /
                    ((ubiRoundNumber - walletToCitizenUBIData[msg.sender].firstUBIRoundVoted) + 1))
            );
            votedThisRound.push(msg.sender);
            // This math must be done at UBI submittal, since UBI withdrawals can/will happen
            // during future UBI rounds.
            currentUBIAmount = uint256(i_ubiToken.ubiPayment());
            totalUBIThisRound = votedThisRound.length * currentUBIAmount;
            totalUBIEver += currentUBIAmount;

            // "Good standing" is 70% or greater for portfolio purposes.
            // Keeps track of percentage of UBI rounds Citizen has completed.
            if (walletToCitizenUBIData[msg.sender].ubiPercentage >= 70) {
                walletToCitizenUBIData[msg.sender].inGoodStanding = true;
            } else {
                walletToCitizenUBIData[msg.sender].inGoodStanding = false;
            }

            avgDCWThisRound = (dcwScore + avgDCWThisRound) / uint32(votedThisRound.length);

            emit CitizenHasVoted();
        }
    }

    // TODO: Might need to change this to having citizens withdraw.
    // When round closes, add UBI amount to withdrawal amount for each user. Claim does not expire.
    function closeRound() external onlyOwner {
        if (ubiRoundIsOpen == false) {
            revert UBIRoundHasAlreadyBeenClosed();
        }
        if (block.timestamp < ubiRoundCloseTime) {
            revert TooEarlyToCloseRound();
        }
        ubiRoundIsOpen = false;
        uint256 timeRoundClosed = block.timestamp;

        emit UBIRoundHasClosed(timeRoundClosed, avgDCWThisRound);
    }

    /** @dev All Proof of Personhood and Citizen Token checks do NOT need to be duplicated here.
     *  With the checks at the UBI submittal call, a delinquent person can only get one
     *  non-compliant UBI distribution. Avoiding data corruption takes precedence over UBI supply.
     *  @notice If a user does not withdraw their UBI for the completed round, it never gets
     *  minted. The user can withdraw the amount even months later, however, they will not be able
     *  to submit UBI until they withdraw. In a production build, there could be a system to mint
     *  UBI into an intermediate, Dashboard-owned wallet, so it could be claimed at a later date,
     *  and the user would be able to submit future rounds of UBI without withdrawing first.
     * Citizen must withdraw before the next UBI round closes (~2 week window) or UBI allotment is burned.
     */
    function withdrawUBI() external {
        if (!registeredCitizens[msg.sender]) {
            revert MustBeRegisteredCitizen();
        }
        if (walletToCitizenUBIData[msg.sender].progress == UBIProgress.HasBeenPaid) {
            revert AlreadyClaimedUBIPayment();
        }
        if (
            walletToCitizenUBIData[msg.sender].progress == UBIProgress.HasNotSubmittedUBI ||
            walletToCitizenUBIData[msg.sender].votedPreviousRound == false
        ) {
            revert MustSubmitUBIBeforePayment();
        }
        if (walletToCitizenUBIData[msg.sender].votedPreviousRound == true) {
            walletToCitizenUBIData[msg.sender].progress = UBIProgress.HasBeenPaid;
            walletToCitizenUBIData[msg.sender].votedPreviousRound = false;
            uint256 ubiAmount;
            ubiAmount = uint256(i_ubiToken.ubiPayment());
            i_ubiToken.payUBI(msg.sender);
            emit CitizenHasBeenPaid(msg.sender, ubiAmount);
        }
    }

    /// Getters

    /// @notice This getter retrieves who has voted for the current UBI round only.
    function getWhoHasVotedThisRound() external view returns (address[] memory) {
        return votedThisRound;
    }

    /// @notice This getter includes math, because if a citizen does not vote for, say,
    /// 45 rounds, then logic will not be triggered to update the ubiPercentage in the
    /// CitizenData struct for those 45 rounds.
    function getCitizenUBIPercentage(address citizen) external view returns (uint8) {
        uint8 percentage = uint8(
            ((walletToCitizenUBIData[citizen].ubiCounter * 100) /
                ((ubiRoundNumber - walletToCitizenUBIData[citizen].firstUBIRoundVoted) + 1))
        );
        return percentage;
    }

    function getUBIStats()
        external
        view
        returns (uint16, uint256, uint256, uint256, uint256, uint256)
    {
        return (
            ubiRoundNumber,
            ubiRoundOpenTime,
            ubiRoundCloseTime,
            totalUBIThisRound,
            totalUBIEver,
            ubiRoundCloseTime + 12 hours
        );
    }

    function getTotalAVGDCWThisRound() external view returns (uint32) {
        return avgDCWThisRound;
    }

    function getUBITokenAddress() external view returns (address) {
        return address(i_ubiToken);
    }
}
