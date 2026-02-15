// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../helpers/ArenaTestSetup.sol";

contract ArenaRewardsFuzzTest is ArenaTestSetup {
    event GameRegistered(bytes32 indexed gameId, address indexed challenger, uint256 timestamp);
    event GameResult(bytes32 indexed gameId, address indexed challenger, uint8 score, bool won, uint256 prizeAmount, bytes32 jokeHash, uint256 timestamp);

    function testFuzz_settleGame_anyScore(uint8 score) public {
        bytes32 gameId = keccak256("fuzzScore");

        vm.prank(admin);
        arena.registerGame(gameId, challenger);

        vm.prank(admin);
        arena.settleGame(gameId, score, true, keccak256("joke"));

        (, bool settled) = arena.games(gameId);
        assertTrue(settled);
    }

    function testFuzz_setPrizeAmount_anyValue(uint256 newPrize) public {
        vm.prank(admin);
        arena.setPrizeAmount(newPrize);

        assertEq(arena.prizeAmount(), newPrize);
    }

    function testFuzz_registerGame_anyGameIdAndChallenger(bytes32 gameId, address _challenger) public {
        vm.assume(_challenger != address(0));

        vm.prank(admin);
        arena.registerGame(gameId, _challenger);

        (address c, bool settled) = arena.games(gameId);
        assertEq(c, _challenger);
        assertFalse(settled);
    }

    function testFuzz_settleGame_eventIntegrity(uint8 score, bool won, bytes32 jokeHash) public {
        bytes32 gameId = keccak256("fuzzEvent");

        vm.prank(admin);
        arena.registerGame(gameId, challenger);

        uint256 expectedPrize = won ? DEFAULT_PRIZE : 0;

        vm.prank(admin);
        vm.expectEmit(true, true, false, true);
        emit GameResult(gameId, challenger, score, won, expectedPrize, jokeHash, block.timestamp);
        arena.settleGame(gameId, score, won, jokeHash);
    }

    function testFuzz_registerGame_duplicateAlwaysReverts(bytes32 gameId, address _challenger) public {
        vm.assume(_challenger != address(0));

        vm.prank(admin);
        arena.registerGame(gameId, _challenger);

        vm.prank(admin);
        vm.expectRevert(ArenaRewards.GameAlreadyExists.selector);
        arena.registerGame(gameId, _challenger);
    }

    function testFuzz_settleGame_nonSettlerAlwaysReverts(address nonSettler) public {
        vm.assume(nonSettler != admin);
        vm.assume(nonSettler != address(0));

        bytes32 gameId = keccak256("fuzzAccess");

        vm.prank(admin);
        arena.registerGame(gameId, challenger);

        vm.prank(nonSettler);
        vm.expectRevert();
        arena.settleGame(gameId, 5, true, keccak256("joke"));
    }
}
