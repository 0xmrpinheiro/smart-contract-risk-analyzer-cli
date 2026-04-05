// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity ^0.8.20;

contract VulnerableVault {
    address public owner;
    address public plugin;
    address[] public recipients;
    mapping(address => uint256) public balances;

    constructor() {
        owner = msg.sender;
    }

    function deposit() external payable {
        balances[msg.sender] += msg.value;
    }

    function insecureWithdraw() external {
        require(tx.origin == owner, "owner only");
        (bool ok, ) = msg.sender.call{value: balances[msg.sender]}("");
        ok;
        balances[msg.sender] = 0;
    }

    function uncheckedPayout(address payable recipient, uint256 amount) external {
        recipient.call{value: amount}("");
    }

    function runPlugin(bytes calldata data) external {
        plugin.delegatecall(data);
    }

    function emergencyDestroy() external {
        selfdestruct(payable(msg.sender));
    }

    function drawRandomWinner() external view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao))) % recipients.length;
    }

    function airdrop() external {
        for (uint256 index = 0; index < recipients.length; index++) {
            balances[recipients[index]] += 1;
        }
    }

    function setFee(address recipient, uint256 amount) external {
        balances[recipient] = amount;
    }
}
