// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../helpers/ArenaTestSetup.sol";

contract ArenaRewardsTest is ArenaTestSetup {
    event GameRegistered(bytes32 indexed gameId, address indexed challenger, uint256 timestamp);
    event GameResult(bytes32 indexed gameId, address indexed challenger, uint8 score, bool won, uint256 prizeAmount, bytes32 jokeHash, uint256 timestamp);
    event PrizeAmountUpdated(uint256 oldAmount, uint256 newAmount);

    // --- registerGame ---

    function testRegisterGame() public {
        bytes32 gameId = keccak256("game1");

        vm.prank(admin);
        vm.expectEmit(true, true, false, true);
        emit GameRegistered(gameId, challenger, block.timestamp);
        arena.registerGame(gameId, challenger);

        (address c, bool settled) = arena.games(gameId);
        assertEq(c, challenger);
        assertFalse(settled);
    }

    function testRegisterGameDuplicateReverts() public {
        bytes32 gameId = keccak256("game1");

        vm.prank(admin);
        arena.registerGame(gameId, challenger);

        vm.prank(admin);
        vm.expectRevert(ArenaRewards.GameAlreadyExists.selector);
        arena.registerGame(gameId, challenger);
    }

    function testRegisterGameZeroAddressReverts() public {
        bytes32 gameId = keccak256("game1");

        vm.prank(admin);
        vm.expectRevert(ArenaRewards.ZeroAddress.selector);
        arena.registerGame(gameId, address(0));
    }

    function testRegisterGameNonSettlerReverts() public {
        bytes32 gameId = keccak256("game1");

        vm.prank(challenger);
        vm.expectRevert();
        arena.registerGame(gameId, challenger);
    }

    // --- settleGame ---

    function testSettleGameWin() public {
        bytes32 gameId = keccak256("game1");

        vm.prank(admin);
        arena.registerGame(gameId, challenger);

        uint256 challengerBal = token.balanceOf(challenger);
        uint256 arenaBal = token.balanceOf(address(arena));

        vm.prank(admin);
        vm.expectEmit(true, true, false, true);
        emit GameResult(gameId, challenger, 8, true, DEFAULT_PRIZE, keccak256("joke"), block.timestamp);
        arena.settleGame(gameId, 8, true, keccak256("joke"));

        assertEq(token.balanceOf(challenger), challengerBal + DEFAULT_PRIZE);
        assertEq(token.balanceOf(address(arena)), arenaBal - DEFAULT_PRIZE);
        (, bool settled) = arena.games(gameId);
        assertTrue(settled);
    }

    function testSettleGameLoss() public {
        bytes32 gameId = keccak256("game1");

        vm.prank(admin);
        arena.registerGame(gameId, challenger);

        uint256 challengerBal = token.balanceOf(challenger);
        uint256 arenaBal = token.balanceOf(address(arena));

        vm.prank(admin);
        arena.settleGame(gameId, 3, false, keccak256("joke"));

        // No tokens transferred
        assertEq(token.balanceOf(challenger), challengerBal);
        assertEq(token.balanceOf(address(arena)), arenaBal);
    }

    function testSettleGameDoubleSettleReverts() public {
        bytes32 gameId = keccak256("game1");

        vm.prank(admin);
        arena.registerGame(gameId, challenger);

        vm.prank(admin);
        arena.settleGame(gameId, 5, true, keccak256("joke"));

        vm.prank(admin);
        vm.expectRevert(ArenaRewards.GameAlreadySettled.selector);
        arena.settleGame(gameId, 5, true, keccak256("joke"));
    }

    function testSettleGameNotFoundReverts() public {
        bytes32 fakeId = keccak256("nonexistent");

        vm.prank(admin);
        vm.expectRevert(ArenaRewards.GameNotFound.selector);
        arena.settleGame(fakeId, 5, true, keccak256("joke"));
    }

    function testSettleGameInsufficientBalanceReverts() public {
        bytes32 gameId = keccak256("game1");

        vm.prank(admin);
        arena.registerGame(gameId, challenger);

        // Drain the pool
        uint256 poolBalance = token.balanceOf(address(arena));
        vm.prank(admin);
        arena.withdrawTokens(admin, poolBalance);

        vm.prank(admin);
        vm.expectRevert(ArenaRewards.InsufficientPrizeBalance.selector);
        arena.settleGame(gameId, 8, true, keccak256("joke"));
    }

    function testSettleGameNonSettlerReverts() public {
        bytes32 gameId = keccak256("game1");

        vm.prank(admin);
        arena.registerGame(gameId, challenger);

        vm.prank(challenger);
        vm.expectRevert();
        arena.settleGame(gameId, 5, true, keccak256("joke"));
    }

    // --- setPrizeAmount ---

    function testSetPrizeAmount() public {
        uint256 newPrize = 2000 ether;

        vm.prank(admin);
        vm.expectEmit(false, false, false, true);
        emit PrizeAmountUpdated(DEFAULT_PRIZE, newPrize);
        arena.setPrizeAmount(newPrize);

        assertEq(arena.prizeAmount(), newPrize);
    }

    function testSetPrizeAmountNonAdminReverts() public {
        vm.prank(challenger);
        vm.expectRevert();
        arena.setPrizeAmount(2000 ether);
    }

    // --- withdrawTokens ---

    function testWithdrawTokens() public {
        uint256 adminBal = token.balanceOf(admin);
        uint256 withdrawAmount = 10_000 ether;

        vm.prank(admin);
        arena.withdrawTokens(admin, withdrawAmount);

        assertEq(token.balanceOf(admin), adminBal + withdrawAmount);
    }

    function testWithdrawTokensNonAdminReverts() public {
        vm.prank(challenger);
        vm.expectRevert();
        arena.withdrawTokens(challenger, 1000 ether);
    }

    // --- prizeBalance ---

    function testPrizeBalance() public view {
        assertEq(arena.prizeBalance(), FUND_AMOUNT);
    }

    function testPrizeBalanceAfterSettle() public {
        bytes32 gameId = keccak256("game1");

        vm.prank(admin);
        arena.registerGame(gameId, challenger);

        vm.prank(admin);
        arena.settleGame(gameId, 8, true, keccak256("joke"));

        assertEq(arena.prizeBalance(), FUND_AMOUNT - DEFAULT_PRIZE);
    }

    // --- Full lifecycle ---

    function testFullLifecycle() public {
        // Fund -> Register -> Settle win -> Verify
        uint256 initialBalance = arena.prizeBalance();
        bytes32 gameId = keccak256("lifecycle");

        vm.prank(admin);
        arena.registerGame(gameId, challenger);

        uint256 challengerBal = token.balanceOf(challenger);

        vm.prank(admin);
        arena.settleGame(gameId, 9, true, keccak256("great joke"));

        assertEq(token.balanceOf(challenger), challengerBal + DEFAULT_PRIZE);
        assertEq(arena.prizeBalance(), initialBalance - DEFAULT_PRIZE);
        assertEq(arena.totalPrizesPaid(), DEFAULT_PRIZE);

        (, bool settled) = arena.games(gameId);
        assertTrue(settled);
    }

    // --- constants ---

    function testConstants() public view {
        assertEq(arena.SETTLER_ROLE(), keccak256("SETTLER_ROLE"));
        assertEq(arena.prizeAmount(), DEFAULT_PRIZE);
    }
}
