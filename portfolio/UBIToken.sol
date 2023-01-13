// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/// @title Universal Basic Information Token
/// @author Armand Daigle
/// @notice This contract and token connect to the UBI Dashboard contract
/// to reward users for submitting information and voting in a DAO or city context.
contract UBIToken is ERC20, Ownable {
    uint256 public startingTimeStamp;
    uint32 public ubiPayment = 1000;

    /// @notice Initial supply can be anything, but 0 is the best for everyone!
    constructor(uint256 initialSupply) ERC20("CityDAO UBI Token", "CUBI") {
        _mint(msg.sender, initialSupply);
        startingTimeStamp = block.timestamp;
    }

    /**
     *  @dev After deploying this contract and UBIDashboard.sol, the owner must
     *  transferOwnership of this contract to the UBIDashboard.sol address, so
     *  it can mint tokens and pay users.
     */
    function payUBI(address to) external onlyOwner {
        _mint(to, ubiIssuanceHalving());
    }

    /// @notice Unlimited supply with halving every ~two years.
    /// @return Current amount, which UBI Dashboard calls out at each payment.
    function ubiIssuanceHalving() public returns (uint32) {
        if ((block.timestamp - startingTimeStamp) >= 730 days) {
            ubiPayment /= 2;
            startingTimeStamp = block.timestamp;
        }
        return (ubiPayment);
    }
}
