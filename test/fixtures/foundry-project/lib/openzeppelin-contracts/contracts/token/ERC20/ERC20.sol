// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

contract ERC20 {
    string public name;
    string public symbol;
    mapping(address => uint256) internal _balances;

    constructor(string memory name_, string memory symbol_) {
        name = name_;
        symbol = symbol_;
    }

    function transfer(address recipient, uint256 amount) public returns (bool) {
        _balances[msg.sender] -= amount;
        _balances[recipient] += amount;
        return true;
    }

    function _mint(address recipient, uint256 amount) internal {
        _balances[recipient] += amount;
    }
}
