// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract UBIToken is ERC20, Ownable {
    uint256 public startingTimeStamp;
    uint32 public ubiPayment = 1000;

    constructor(uint256 initialSupply) ERC20("CityDAO UBI Token", "CUBI") {
        _mint(msg.sender, initialSupply);
        startingTimeStamp = block.timestamp;
    }

    function payUBI(address to) external onlyOwner {
        _mint(to, ubiIssuanceHalving());
    }

    function ubiIssuanceHalving() public returns (uint32) {
        if ((block.timestamp - startingTimeStamp) >= 730 days) {
            ubiPayment /= 2;
            startingTimeStamp = block.timestamp;
        }
        return (ubiPayment);
    }
}
