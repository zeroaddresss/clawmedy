// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract ArenaRewards is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant SETTLER_ROLE = keccak256("SETTLER_ROLE");

    IERC20 public immutable token;
    uint256 public prizeAmount;
    uint256 public totalPrizesPaid;

    struct Game {
        address challenger;
        bool settled;
    }

    mapping(bytes32 => Game) public games;

    event GameRegistered(
        bytes32 indexed gameId,
        address indexed challenger,
        uint256 timestamp
    );

    event GameResult(
        bytes32 indexed gameId,
        address indexed challenger,
        uint8 score,
        bool won,
        uint256 prizeAmount,
        bytes32 jokeHash,
        uint256 timestamp
    );

    event PrizeAmountUpdated(uint256 oldAmount, uint256 newAmount);

    error GameAlreadySettled();
    error GameNotFound();
    error GameAlreadyExists();
    error ZeroAddress();
    error InsufficientPrizeBalance();

    constructor(address _token, uint256 _prizeAmount, address admin) {
        if (_token == address(0) || admin == address(0)) revert ZeroAddress();
        token = IERC20(_token);
        prizeAmount = _prizeAmount;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(SETTLER_ROLE, admin);
    }

    function registerGame(bytes32 gameId, address challenger) external onlyRole(SETTLER_ROLE) {
        if (challenger == address(0)) revert ZeroAddress();
        if (games[gameId].challenger != address(0)) revert GameAlreadyExists();

        games[gameId] = Game({
            challenger: challenger,
            settled: false
        });

        emit GameRegistered(gameId, challenger, block.timestamp);
    }

    function settleGame(
        bytes32 gameId,
        uint8 score,
        bool challengerWon,
        bytes32 jokeHash
    ) external onlyRole(SETTLER_ROLE) nonReentrant {
        Game storage game = games[gameId];
        if (game.challenger == address(0)) revert GameNotFound();
        if (game.settled) revert GameAlreadySettled();

        game.settled = true;

        uint256 prize = 0;
        if (challengerWon) {
            prize = prizeAmount;
            if (token.balanceOf(address(this)) < prize) revert InsufficientPrizeBalance();
            totalPrizesPaid += prize;
            token.safeTransfer(game.challenger, prize);
        }

        emit GameResult(
            gameId,
            game.challenger,
            score,
            challengerWon,
            prize,
            jokeHash,
            block.timestamp
        );
    }

    function setPrizeAmount(uint256 _prizeAmount) external onlyRole(DEFAULT_ADMIN_ROLE) {
        uint256 old = prizeAmount;
        prizeAmount = _prizeAmount;
        emit PrizeAmountUpdated(old, _prizeAmount);
    }

    function withdrawTokens(address to, uint256 amount) external onlyRole(DEFAULT_ADMIN_ROLE) nonReentrant {
        if (to == address(0)) revert ZeroAddress();
        token.safeTransfer(to, amount);
    }

    function prizeBalance() external view returns (uint256) {
        return token.balanceOf(address(this));
    }
}
