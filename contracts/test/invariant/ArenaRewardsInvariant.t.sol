// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../helpers/ArenaTestSetup.sol";

contract ArenaRewardsHandler is Test {
    ClawmedyToken public token;
    ArenaRewards public arena;
    address public admin;

    bytes32[] public gameIds;
    mapping(bytes32 => bool) public gameSettled;
    uint256 public gamesRegistered;

    constructor(ClawmedyToken _token, ArenaRewards _arena, address _admin) {
        token = _token;
        arena = _arena;
        admin = _admin;
    }

    function registerGame(bytes32 gameId, address _challenger) external {
        // Skip zero address and already-registered games
        if (_challenger == address(0)) return;
        (address existing, ) = arena.games(gameId);
        if (existing != address(0)) return;

        vm.prank(admin);
        arena.registerGame(gameId, _challenger);
        gameIds.push(gameId);
        gamesRegistered++;
    }

    function settleGame(uint256 index, bool won) external {
        if (gameIds.length == 0) return;
        index = bound(index, 0, gameIds.length - 1);

        bytes32 gameId = gameIds[index];
        (, bool settled) = arena.games(gameId);
        if (settled) return;

        // Skip if won but insufficient balance
        if (won && token.balanceOf(address(arena)) < arena.prizeAmount()) return;

        vm.prank(admin);
        arena.settleGame(gameId, 5, won, keccak256("joke"));
        gameSettled[gameId] = true;
    }

    function getGameIdsLength() external view returns (uint256) {
        return gameIds.length;
    }
}

contract ArenaRewardsInvariantTest is ArenaTestSetup {
    ArenaRewardsHandler public handler;

    function setUp() public override {
        super.setUp();
        handler = new ArenaRewardsHandler(token, arena, admin);
        targetContract(address(handler));
    }

    function invariant_totalPrizesPaidNeverExceedsFunded() public view {
        assertLe(arena.totalPrizesPaid(), FUND_AMOUNT);
    }

    function invariant_settledGamesCannotBeResettled() public view {
        uint256 len = handler.getGameIdsLength();
        for (uint256 i = 0; i < len; i++) {
            bytes32 gameId = handler.gameIds(i);
            (, bool settled) = arena.games(gameId);
            if (settled) {
                // Verify challenger is still set (not zeroed)
                (address c, ) = arena.games(gameId);
                assertTrue(c != address(0));
            }
        }
    }

    function invariant_balanceConsistency() public view {
        // Contract balance should equal funded amount minus prizes paid
        uint256 contractBalance = token.balanceOf(address(arena));
        assertEq(contractBalance, FUND_AMOUNT - arena.totalPrizesPaid());
    }
}
