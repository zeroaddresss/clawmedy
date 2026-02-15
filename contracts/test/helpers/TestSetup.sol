// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Test.sol";
import "../../src/ClawmedyToken.sol";
import "../../src/WagerEscrow.sol";

abstract contract TestSetup is Test {
    ClawmedyToken public token;
    WagerEscrow public escrow;

    address public admin = makeAddr("admin");
    address public treasury = makeAddr("treasury");
    address public challenger = makeAddr("challenger");
    address public user2 = makeAddr("user2");

    uint256 public constant INITIAL_MINT = 1_000_000 ether;
    uint256 public constant DEFAULT_WAGER = 100 ether;

    function setUp() public virtual {
        vm.startPrank(admin);

        token = new ClawmedyToken(admin);
        token.mint(admin, INITIAL_MINT);

        escrow = new WagerEscrow(address(token), treasury, admin);

        // Fund challenger
        token.transfer(challenger, 10_000 ether);

        // Fund user2
        token.transfer(user2, 10_000 ether);

        vm.stopPrank();

        // Approve escrow for challenger
        vm.prank(challenger);
        token.approve(address(escrow), type(uint256).max);

        // Approve escrow for user2
        vm.prank(user2);
        token.approve(address(escrow), type(uint256).max);
    }
}
