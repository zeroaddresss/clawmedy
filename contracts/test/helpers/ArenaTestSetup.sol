// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../src/ClawmedyToken.sol";
import "../../src/ArenaRewards.sol";

abstract contract ArenaTestSetup is Test {
    ClawmedyToken public token;
    ArenaRewards public arena;

    address public admin = makeAddr("admin");
    address public challenger = makeAddr("challenger");
    address public user2 = makeAddr("user2");

    uint256 public constant INITIAL_MINT = 1_000_000 ether;
    uint256 public constant DEFAULT_PRIZE = 1000 ether;
    uint256 public constant FUND_AMOUNT = 100_000 ether;

    function setUp() public virtual {
        vm.startPrank(admin);

        token = new ClawmedyToken(admin);
        token.mint(admin, INITIAL_MINT);

        arena = new ArenaRewards(address(token), DEFAULT_PRIZE, admin);

        // Fund the arena contract with prize pool
        token.transfer(address(arena), FUND_AMOUNT);

        vm.stopPrank();
    }
}
