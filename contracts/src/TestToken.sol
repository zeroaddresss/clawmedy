// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Dummy ERC20 for testing. Anyone can mint.
contract TestToken is ERC20 {
    constructor() ERC20("TestClaw", "TCLAW") {
        _mint(msg.sender, 1_000_000e18);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
