// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

contract WagerEscrow is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant SETTLER_ROLE = keccak256("SETTLER_ROLE");
    uint256 public constant GAME_TIMEOUT = 24 hours;

    IERC20 public immutable token;
    address public treasury;
    uint256 private _gameNonce;

    struct Game {
        address challenger;
        uint256 amount;
        uint256 createdAt;
        bool settled;
    }

    mapping(bytes32 => Game) public games;

    event GameCreated(
        bytes32 indexed gameId,
        address indexed challenger,
        uint256 wagerAmount,
        uint256 timestamp
    );

    event GameResult(
        bytes32 indexed gameId,
        address indexed challenger,
        uint8 score,
        bool won,
        uint256 wagerAmount,
        bytes32 jokeHash,
        uint256 timestamp
    );

    event GameRefunded(
        bytes32 indexed gameId,
        address indexed challenger,
        uint256 amount
    );

    error GameAlreadySettled();
    error GameNotFound();
    error ZeroAmount();
    error ZeroAddress();
    error GameExpired();
    error GameNotExpired();

    constructor(address _token, address _treasury, address admin) {
        if (_treasury == address(0)) revert ZeroAddress();
        token = IERC20(_token);
        treasury = _treasury;
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(SETTLER_ROLE, admin);
    }

    function createGame(uint256 amount) external nonReentrant returns (bytes32 gameId) {
        if (amount == 0) revert ZeroAmount();

        gameId = keccak256(abi.encodePacked(msg.sender, block.timestamp, _gameNonce++));

        games[gameId] = Game({
            challenger: msg.sender,
            amount: amount,
            createdAt: block.timestamp,
            settled: false
        });

        token.safeTransferFrom(msg.sender, address(this), amount);

        emit GameCreated(gameId, msg.sender, amount, block.timestamp);
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

        if (challengerWon) {
            token.safeTransfer(game.challenger, game.amount);
        } else {
            token.safeTransfer(treasury, game.amount);
        }

        emit GameResult(
            gameId,
            game.challenger,
            score,
            challengerWon,
            game.amount,
            jokeHash,
            block.timestamp
        );
    }

    function refundExpiredGame(bytes32 gameId) external {
        Game storage game = games[gameId];
        if (game.challenger == address(0)) revert GameNotFound();
        if (game.settled) revert GameAlreadySettled();
        if (block.timestamp < game.createdAt + GAME_TIMEOUT) revert GameNotExpired();

        game.settled = true;
        token.safeTransfer(game.challenger, game.amount);
        emit GameRefunded(gameId, game.challenger, game.amount);
    }

    function setTreasury(address _treasury) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (_treasury == address(0)) revert ZeroAddress();
        treasury = _treasury;
    }
}
