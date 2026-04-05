// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import "openzeppelin-contracts/token/ERC20/ERC20.sol";

contract FoundryToken is ERC20 {
    constructor() ERC20("FoundryToken", "FND") {}

    function rescue(address payable recipient, uint256 amount) external {
        recipient.transfer(amount);
    }
}
