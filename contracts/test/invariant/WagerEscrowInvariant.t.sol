// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../helpers/TestSetup.sol";

contract WagerEscrowHandler is Test {
    ClawmedyToken public token;
    WagerEscrow public escrow;
    address public admin;
    address public challenger;

    bytes32[] public gameIds;
    uint256 public totalDeposited;
    uint256 public totalWithdrawn;

    constructor(ClawmedyToken _token, WagerEscrow _escrow, address _admin, address _challenger) {
        token = _token;
        escrow = _escrow;
        admin = _admin;
        challenger = _challenger;
    }

    function createGame(uint256 amount) external {
        amount = bound(amount, 1, 100 ether);

        if (token.balanceOf(challenger) < amount) return;

        vm.prank(challenger);
        bytes32 gameId = escrow.createGame(amount);
        gameIds.push(gameId);
        totalDeposited += amount;
    }

    function settleGame(uint256 index, bool won) external {
        if (gameIds.length == 0) return;
        index = bound(index, 0, gameIds.length - 1);

        bytes32 gameId = gameIds[index];
        (, , , bool settled) = escrow.games(gameId);
        if (settled) return;

        vm.prank(admin);
        escrow.settleGame(gameId, 5, won, keccak256("joke"));
        (, uint256 amount, , ) = escrow.games(gameId);
        totalWithdrawn += amount;
    }

    function refundExpiredGame(uint256 index) external {
        if (gameIds.length == 0) return;
        index = bound(index, 0, gameIds.length - 1);

        bytes32 gameId = gameIds[index];
        (, , uint256 createdAt, bool settled) = escrow.games(gameId);
        if (settled) return;
        if (block.timestamp < createdAt + 24 hours) {
            vm.warp(createdAt + 24 hours + 1);
        }

        escrow.refundExpiredGame(gameId);
        (, uint256 amount, , ) = escrow.games(gameId);
        totalWithdrawn += amount;
    }

    function getGameIdsLength() external view returns (uint256) {
        return gameIds.length;
    }
}

contract WagerEscrowInvariantTest is TestSetup {
    WagerEscrowHandler public handler;

    function setUp() public override {
        super.setUp();
        handler = new WagerEscrowHandler(token, escrow, admin, challenger);

        // Give handler's challenger enough tokens
        // (challenger already funded in TestSetup)

        targetContract(address(handler));
    }

    function invariant_tokenConservation() public view {
        uint256 escrowBalance = token.balanceOf(address(escrow));
        uint256 activeAmount = handler.totalDeposited() - handler.totalWithdrawn();
        assertEq(escrowBalance, activeAmount);
    }

    function invariant_settledGamesAreImmutable() public view {
        uint256 len = handler.getGameIdsLength();
        for (uint256 i = 0; i < len; i++) {
            bytes32 gameId = handler.gameIds(i);
            (, , , bool settled) = escrow.games(gameId);
            if (settled) {
                // Game is settled - verify challenger is still set (not zeroed)
                (address c, , , ) = escrow.games(gameId);
                assertTrue(c != address(0));
            }
        }
    }

    function invariant_escrowBalanceMatchesActiveGames() public view {
        uint256 activeSum = 0;
        uint256 len = handler.getGameIdsLength();
        for (uint256 i = 0; i < len; i++) {
            bytes32 gameId = handler.gameIds(i);
            (, uint256 amount, , bool settled) = escrow.games(gameId);
            if (!settled) {
                activeSum += amount;
            }
        }
        assertEq(token.balanceOf(address(escrow)), activeSum);
    }

    function invariant_noStuckFunds() public view {
        uint256 escrowBalance = token.balanceOf(address(escrow));
        uint256 activeSum = 0;
        uint256 len = handler.getGameIdsLength();
        for (uint256 i = 0; i < len; i++) {
            bytes32 gameId = handler.gameIds(i);
            (, uint256 amount, , bool settled) = escrow.games(gameId);
            if (!settled) {
                activeSum += amount;
            }
        }
        // No extra funds stuck in escrow beyond active games
        assertEq(escrowBalance, activeSum);
    }
}
