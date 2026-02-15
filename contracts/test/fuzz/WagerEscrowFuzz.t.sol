// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../helpers/TestSetup.sol";

contract WagerEscrowFuzzTest is TestSetup {
    event GameCreated(bytes32 indexed gameId, address indexed challenger, uint256 wagerAmount, uint256 timestamp);
    event GameResult(bytes32 indexed gameId, address indexed challenger, uint8 score, bool won, uint256 wagerAmount, bytes32 jokeHash, uint256 timestamp);

    function testFuzz_createGame_anyAmount(uint256 amount) public {
        amount = bound(amount, 1, 10_000 ether);

        vm.prank(challenger);
        bytes32 gameId = escrow.createGame(amount);

        (address c, uint256 amt, , bool settled) = escrow.games(gameId);
        assertEq(c, challenger);
        assertEq(amt, amount);
        assertFalse(settled);
    }

    function testFuzz_settleGame_anyScore(uint8 score, bool won) public {
        vm.prank(challenger);
        bytes32 gameId = escrow.createGame(DEFAULT_WAGER);

        vm.prank(admin);
        escrow.settleGame(gameId, score, won, keccak256("joke"));

        (, , , bool settled) = escrow.games(gameId);
        assertTrue(settled);
    }

    function testFuzz_refundExpiredGame_anyTimeAfterTimeout(uint256 extraTime) public {
        extraTime = bound(extraTime, 1, 365 days);

        vm.prank(challenger);
        bytes32 gameId = escrow.createGame(DEFAULT_WAGER);

        vm.warp(block.timestamp + 24 hours + extraTime);

        uint256 balBefore = token.balanceOf(challenger);
        escrow.refundExpiredGame(gameId);
        assertEq(token.balanceOf(challenger), balBefore + DEFAULT_WAGER);
    }

    function testFuzz_createGame_revertsOnZero(uint256) public {
        vm.prank(challenger);
        vm.expectRevert(WagerEscrow.ZeroAmount.selector);
        escrow.createGame(0);
    }

    function testFuzz_settleGame_eventIntegrity(uint8 score, bool won, bytes32 jokeHash) public {
        vm.prank(challenger);
        bytes32 gameId = escrow.createGame(DEFAULT_WAGER);

        vm.prank(admin);
        vm.expectEmit(true, true, false, true);
        emit GameResult(gameId, challenger, score, won, DEFAULT_WAGER, jokeHash, block.timestamp);
        escrow.settleGame(gameId, score, won, jokeHash);
    }

    function testFuzz_multipleGames_isolation(uint256 amount1, uint256 amount2) public {
        amount1 = bound(amount1, 1, 5_000 ether);
        amount2 = bound(amount2, 1, 5_000 ether);

        vm.prank(challenger);
        bytes32 gameId1 = escrow.createGame(amount1);

        vm.prank(challenger);
        bytes32 gameId2 = escrow.createGame(amount2);

        assertTrue(gameId1 != gameId2);

        (address c1, uint256 a1, , ) = escrow.games(gameId1);
        (address c2, uint256 a2, , ) = escrow.games(gameId2);

        assertEq(c1, challenger);
        assertEq(c2, challenger);
        assertEq(a1, amount1);
        assertEq(a2, amount2);
    }

    function testFuzz_refundBeforeTimeout_reverts(uint256 timePassed) public {
        vm.prank(challenger);
        bytes32 gameId = escrow.createGame(DEFAULT_WAGER);

        // Get the creation time, then bound timePassed so we stay before timeout
        (, , uint256 createdAt, ) = escrow.games(gameId);
        timePassed = bound(timePassed, 0, 24 hours - 1);

        vm.warp(createdAt + timePassed);

        vm.expectRevert(WagerEscrow.GameNotExpired.selector);
        escrow.refundExpiredGame(gameId);
    }

    function testFuzz_settleGame_nonSettlerAlwaysReverts(address nonSettler) public {
        vm.assume(nonSettler != admin);
        vm.assume(nonSettler != address(0));

        vm.prank(challenger);
        bytes32 gameId = escrow.createGame(DEFAULT_WAGER);

        vm.prank(nonSettler);
        vm.expectRevert();
        escrow.settleGame(gameId, 5, true, keccak256("joke"));
    }
}
