// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "./UBIToken.sol";
// import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC1155/IERC1155.sol";

/** @title Universal Basic Information Dashboard
 *  @author Armand Daigle
 *  @notice This contract rewards registered users with the UBI Token for submitting information
 *  and voting in a city or DAO context. Proof of Humanity, Proof of Existence, and CityDAO Citizen
 *  NFT requires/checks have been removed so that this contract can be deployed and interacted with
 *  by anyone. However, to demonstrate functionality in a concrete context, the variables and
 *  comments have been written with CityDAO in mind. 'Citizens' in general to mean DAO members.
 *  However, the bigger goal would be to implement this in actual cities of course. To see a version
 *  with all bells and whistles, check the UBIDashboard.sol file in the "../portfolio" folder.
 *  @dev If it is desired to only allow the contract owner to open and close UBI rounds, uncomment
 *  the Ownable.sol import line, uncomment the 'onlyOwner' modifiers on those functions, and add
 *  'is Ownable' after the contract name.
 */
contract UBIDashboard {
    struct CitizenData {
        UBIProgress progress;
        uint16 ubiCounter;
        uint16 firstUBIRoundVoted;
        uint8 ubiPercentage;
        bool inGoodStanding;
        bool votedPreviousRound;
    }

    /// Enum keeps track of what stage each Citizen is at
    enum UBIProgress {
        HasNotSubmittedUBI,
        HasSubmittedUBI,
        HasBeenPaid
    }

    /// Immutable Interface Variables
    UBIToken public immutable i_ubiToken;

    /// Mappings and Variables for Citizen Data
    mapping(address => bool) public registeredCitizens;
    mapping(address => CitizenData) public walletToCitizenUBIData;

    /// State Variables - UBI Rounds
    address[] public votedThisRound;
    uint256 public currentUBIAmount;
    uint256 public totalUBIThisRound;
    uint256 public totalUBIEver;
    uint256 public ubiRoundOpenTime;
    uint256 public ubiRoundCloseTime;
    uint32 public avgDCWThisRound;
    uint16 public ubiRoundNumber;
    bool public ubiRoundIsOpen;

    /// Events
    event CitizenHasRegistered(address);
    event UBIRoundHasOpened(uint256, uint256);
    event CitizenHasVoted(); // No address emitted to maintain some privacy.
    event UBIRoundHasClosed(uint256, uint32);
    event CitizenHasBeenPaid(address, uint256);

    /// Errors
    error AlreadyRegistered();
    error MustHoldCitizenNFT(string, address);
    error MustBeRegisteredCitizen();
    error UBIRoundIsAlreadyOpen();
    error TooEarlyToCloseRound();
    error UBIRoundHasAlreadyBeenClosed();
    error ScoreMustBeBetween0and100();
    error WithdrawFirstORAlreadySubmitted();
    error MustBeInGoodStanding();
    error MustSubmitUBIBeforePayment();
    error AlreadyClaimedUBIPayment();

    constructor(address _ubiToken) {
        i_ubiToken = UBIToken(_ubiToken);
    }

    receive() external payable {}

    fallback() external payable {}

    /** @dev This function handles Citizen/Member Registration and can be implemented in several
     *  ways.
     */
    function register() external {
        // Does not let user register twice
        if (registeredCitizens[msg.sender]) {
            revert AlreadyRegistered();
        }

        // See portfolio version of this contract for Citizen NFT and proof of personhood checks.

        // This mapping makes the whole system go.
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

    /** @notice Timestamps are converted to regular datetime on the front end.
     *  @dev Chainlink Automation can be used to open and close UBI rounds. Refer to the README
     *  for more info. Either way, anyone can call this function.
     */
    function openRound() external /*onlyOwner*/ {
        if (ubiRoundIsOpen == true) {
            revert UBIRoundIsAlreadyOpen();
        }

        // We reset round variables to fresh states. (As Dave Grohl says, "Fresh POOOTS!")
        delete votedThisRound;
        ubiRoundIsOpen = true;
        ubiRoundNumber++;
        ubiRoundOpenTime = block.timestamp;
        avgDCWThisRound = 0;
        totalUBIThisRound = 0;
        // Twelve hours between rounds to allow for updating, maintenance, etc.
        ubiRoundCloseTime = ubiRoundOpenTime + 13 days + 12 hours;
        emit UBIRoundHasOpened(ubiRoundOpenTime, ubiRoundCloseTime);
    }

    /** @notice In it's full form, submitUBI is intended to have many requirements, including
     *  knowledge quizzes, community feedback surveys, proposal education and discussion, and
     *  voting completion. For portfolio purposes, Citizens will only answer one question on the
     *  front end and submit their Democratic (or DAO) Collective Welfare (DCW) Score with this
     *  function. However, the nuts and bolts are all there to make this a full-fledged UBI system
     *  and dashboard. To read more on DCW, read the essay by Ralph Merkle that is linked to in the
     *  README.
     *  @dev All Proof of Personhood and Citizen Token checks can be duplicated here if desired,
     *  to ensure that all Citizens / DAO members keep current with their identifications and as an
     *  anti-shenanigans measure.
     *  @param dcwScore Each Citizen / DAO member has a routine chance to update their score.
     */
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
            // This boolean needs to be set here at this user touchpoint but will be used during
            // the next round when user withdraws. This eliminates the need for a for loop to reset
            // statuses.
            walletToCitizenUBIData[msg.sender].votedPreviousRound = true;
            // Add 1 to the denominator since the first round a person votes should be counted. We
            // also need to avoid fractions below 1, so we multiply by 100 before dividing.
            walletToCitizenUBIData[msg.sender].ubiPercentage = uint8(
                ((walletToCitizenUBIData[msg.sender].ubiCounter * 100) /
                    ((ubiRoundNumber - walletToCitizenUBIData[msg.sender].firstUBIRoundVoted) + 1))
            );
            votedThisRound.push(msg.sender);
            // This math must be done at UBI submittal, since UBI withdrawals can/will happen
            // during future UBI rounds.
            currentUBIAmount = i_ubiToken.ubiPayment();
            totalUBIThisRound = votedThisRound.length * currentUBIAmount;
            totalUBIEver += currentUBIAmount;

            // For portfolio purposes, a Citizen is considered to be in UBI "good standing" if
            // they have completed 70% or more of the UBI rounds since the Citizen first voted.
            if (walletToCitizenUBIData[msg.sender].ubiPercentage >= 70) {
                walletToCitizenUBIData[msg.sender].inGoodStanding = true;
            } else {
                walletToCitizenUBIData[msg.sender].inGoodStanding = false;
            }

            avgDCWThisRound = (dcwScore + avgDCWThisRound) / uint32(votedThisRound.length);

            emit CitizenHasVoted();
        }
    }

    /// @dev Straight forward function that is called by the Chainlink Automation Network
    /// in a production build. Either way, anyone can call this function.
    function closeRound() external /*onlyOwner*/ {
        if (ubiRoundIsOpen == false) {
            revert UBIRoundHasAlreadyBeenClosed();
        }
        // This if statement is commented out so anyone can open and close rounds on command for
        // portfolio purposes. The unit tests were done with this section uncommented.
        // if (block.timestamp < ubiRoundCloseTime) {
        //     revert TooEarlyToCloseRound();
        // }
        ubiRoundIsOpen = false;
        uint256 timeRoundClosed = block.timestamp;

        emit UBIRoundHasClosed(timeRoundClosed, avgDCWThisRound);
    }

    /** @notice User can withdraw/claim at any time, inside or outside any UBI round. If a user does
     *  not withdraw their UBI for the completed round, it gets accounted for in the submitUBI logic
     *  for the totalUBIThisRound and totalUBIEver variables, but it's possible that the tokens never
     *  get minted on the blockchain. The user can withdraw the amount even years later, however,
     *  they will not be able to submit UBI until they withdraw. This was done for simplicity's sake
     *  and to eliminate pricey loops to change UBI stage gating at open or close of each round.
     *  @dev All Proof of Personhood and Citizen Token checks do NOT need to be duplicated here.
     *  With the checks at the UBI submittal call, a delinquent person can only claim one
     *  non-compliant UBI distribution. Avoiding data corruption takes precedence over UBI supply.
     */
    function withdrawUBI() external {
        if (!registeredCitizens[msg.sender]) {
            revert MustBeRegisteredCitizen();
        }
        if (walletToCitizenUBIData[msg.sender].progress == UBIProgress.HasBeenPaid) {
            revert AlreadyClaimedUBIPayment();
        }
        /* The "good standing" check has been commented out so that users can freely test the UBI
         * withdrawal function without having to worry about being in good standing. Note: if it
         * is desired for this check to be implemented, this function and submitUBI() need to be
         * altered so that the user can still vote, just not withdraw.
         */
        // if (walletToCitizenUBIData[msg.sender].inGoodStanding == false) {
        //     revert MustBeInGoodStanding();
        // }
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
            ubiAmount = i_ubiToken.ubiPayment();
            // Finally, the actual minting.
            i_ubiToken.payUBI(msg.sender);
            emit CitizenHasBeenPaid(msg.sender, ubiAmount);
        }
    }

    /// Getters
    /// @notice In between rounds, "...ThisRound" means the one that just ended.
    /// @return Once openRound() is called, this array is emptied and begins anew.
    function getWhoHasVotedThisRound() external view returns (address[] memory) {
        return votedThisRound;
    }

    /** @dev This getter includes math because if a Citizen does not vote for, say, 45 rounds,
     *  then the logic will not be triggered to update the ubiPercentage in the CitizenData struct
     *  for those 45 rounds.
     */
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
