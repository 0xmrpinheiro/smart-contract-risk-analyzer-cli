// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

abstract contract Ownable {
    address public owner;

    modifier onlyOwner() {
        require(msg.sender == owner, "owner only");
        _;
    }

    constructor() {
        owner = msg.sender;
    }
}

contract SafeVault is Ownable {
    mapping(address => uint256) private balances;

    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    function withdraw(uint256 amount) external {
        require(balances[msg.sender] >= amount, "insufficient balance");
        balances[msg.sender] -= amount;

        (bool success, ) = msg.sender.call{value: amount}("");
        require(success, "transfer failed");
    }

    function setBalance(address account, uint256 amount) external onlyOwner {
        balances[account] = amount;
    }
}
