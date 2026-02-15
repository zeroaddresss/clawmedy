// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../helpers/TestSetup.sol";

contract WagerEscrowTest is TestSetup {
    event GameCreated(bytes32 indexed gameId, address indexed challenger, uint256 wagerAmount, uint256 timestamp);
    event GameResult(bytes32 indexed gameId, address indexed challenger, uint8 score, bool won, uint256 wagerAmount, bytes32 jokeHash, uint256 timestamp);
    event GameRefunded(bytes32 indexed gameId, address indexed challenger, uint256 amount);

    // --- createGame ---

    function testCreateGame() public {
        uint256 balBefore = token.balanceOf(challenger);

        vm.prank(challenger);
        vm.expectEmit(false, true, false, true);
        emit GameCreated(bytes32(0), challenger, DEFAULT_WAGER, block.timestamp);
        bytes32 gameId = escrow.createGame(DEFAULT_WAGER);

        assertEq(token.balanceOf(challenger), balBefore - DEFAULT_WAGER);
        assertEq(token.balanceOf(address(escrow)), DEFAULT_WAGER);

        (address c, uint256 amt, uint256 createdAt, bool settled) = escrow.games(gameId);
        assertEq(c, challenger);
        assertEq(amt, DEFAULT_WAGER);
        assertEq(createdAt, block.timestamp);
        assertFalse(settled);
    }

    function testCreateGameZeroReverts() public {
        vm.prank(challenger);
        vm.expectRevert(WagerEscrow.ZeroAmount.selector);
        escrow.createGame(0);
    }

    function testCreateGameNoApprovalReverts() public {
        address noApproval = makeAddr("noApproval");
        vm.prank(admin);
        token.mint(noApproval, 1000 ether);

        vm.prank(noApproval);
        vm.expectRevert();
        escrow.createGame(100 ether);
    }

    // --- settleGame ---

    function testSettleGameWin() public {
        vm.prank(challenger);
        bytes32 gameId = escrow.createGame(DEFAULT_WAGER);

        uint256 challengerBal = token.balanceOf(challenger);

        vm.prank(admin);
        escrow.settleGame(gameId, 8, true, keccak256("joke"));

        assertEq(token.balanceOf(challenger), challengerBal + DEFAULT_WAGER);
        (, , , bool settled) = escrow.games(gameId);
        assertTrue(settled);
    }

    function testSettleGameLoss() public {
        vm.prank(challenger);
        bytes32 gameId = escrow.createGame(DEFAULT_WAGER);

        uint256 treasuryBal = token.balanceOf(treasury);

        vm.prank(admin);
        escrow.settleGame(gameId, 3, false, keccak256("joke"));

        assertEq(token.balanceOf(treasury), treasuryBal + DEFAULT_WAGER);
    }

    function testSettleGameDoubleSettleReverts() public {
        vm.prank(challenger);
        bytes32 gameId = escrow.createGame(DEFAULT_WAGER);

        vm.prank(admin);
        escrow.settleGame(gameId, 5, true, keccak256("joke"));

        vm.prank(admin);
        vm.expectRevert(WagerEscrow.GameAlreadySettled.selector);
        escrow.settleGame(gameId, 5, true, keccak256("joke"));
    }

    function testSettleGameNonExistentReverts() public {
        bytes32 fakeId = keccak256("nonexistent");

        vm.prank(admin);
        vm.expectRevert(WagerEscrow.GameNotFound.selector);
        escrow.settleGame(fakeId, 5, true, keccak256("joke"));
    }

    function testSettleGameNonSettlerReverts() public {
        vm.prank(challenger);
        bytes32 gameId = escrow.createGame(DEFAULT_WAGER);

        vm.prank(challenger);
        vm.expectRevert();
        escrow.settleGame(gameId, 5, true, keccak256("joke"));
    }

    // --- setTreasury ---

    function testSetTreasury() public {
        address newTreasury = makeAddr("newTreasury");

        vm.prank(admin);
        escrow.setTreasury(newTreasury);

        assertEq(escrow.treasury(), newTreasury);
    }

    function testSetTreasuryZeroAddressReverts() public {
        vm.prank(admin);
        vm.expectRevert(WagerEscrow.ZeroAddress.selector);
        escrow.setTreasury(address(0));
    }

    function testSetTreasuryNonAdminReverts() public {
        vm.prank(challenger);
        vm.expectRevert();
        escrow.setTreasury(makeAddr("newTreasury"));
    }

    // --- refundExpiredGame ---

    function testRefundExpiredGameSuccess() public {
        vm.prank(challenger);
        bytes32 gameId = escrow.createGame(DEFAULT_WAGER);

        uint256 balBefore = token.balanceOf(challenger);

        // Warp past timeout
        vm.warp(block.timestamp + 24 hours + 1);

        vm.expectEmit(true, true, false, true);
        emit GameRefunded(gameId, challenger, DEFAULT_WAGER);
        escrow.refundExpiredGame(gameId);

        assertEq(token.balanceOf(challenger), balBefore + DEFAULT_WAGER);
        (, , , bool settled) = escrow.games(gameId);
        assertTrue(settled);
    }

    function testRefundExpiredGameNotExpiredReverts() public {
        vm.prank(challenger);
        bytes32 gameId = escrow.createGame(DEFAULT_WAGER);

        vm.expectRevert(WagerEscrow.GameNotExpired.selector);
        escrow.refundExpiredGame(gameId);
    }

    function testRefundExpiredGameAlreadySettledReverts() public {
        vm.prank(challenger);
        bytes32 gameId = escrow.createGame(DEFAULT_WAGER);

        vm.prank(admin);
        escrow.settleGame(gameId, 5, true, keccak256("joke"));

        vm.warp(block.timestamp + 24 hours + 1);

        vm.expectRevert(WagerEscrow.GameAlreadySettled.selector);
        escrow.refundExpiredGame(gameId);
    }

    function testRefundExpiredGameNonExistentReverts() public {
        bytes32 fakeId = keccak256("nonexistent");
        vm.expectRevert(WagerEscrow.GameNotFound.selector);
        escrow.refundExpiredGame(fakeId);
    }

    // --- constants ---

    function testConstants() public view {
        assertEq(escrow.SETTLER_ROLE(), keccak256("SETTLER_ROLE"));
        assertEq(escrow.GAME_TIMEOUT(), 24 hours);
    }
}
