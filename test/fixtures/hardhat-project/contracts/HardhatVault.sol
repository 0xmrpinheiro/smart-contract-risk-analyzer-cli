// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract HardhatVault is ERC20 {
    constructor() ERC20("HardhatVault", "HVT") {}

    function drain(address payable recipient) external {
        recipient.call{value: address(this).balance}("");
    }
}
