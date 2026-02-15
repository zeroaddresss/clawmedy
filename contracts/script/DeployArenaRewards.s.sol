// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/ClawmedyToken.sol";
import "../src/ArenaRewards.sol";

contract DeployArenaRewards is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);
        address tokenAddress = vm.envAddress("TOKEN_ADDRESS");

        vm.startBroadcast(deployerPrivateKey);

        ClawmedyToken token = ClawmedyToken(tokenAddress);

        ArenaRewards arena = new ArenaRewards(address(token), 1000e18, deployer);

        // Grant SETTLER_ROLE to deployer (game server signer)
        arena.grantRole(arena.SETTLER_ROLE(), deployer);

        vm.stopBroadcast();

        // Write addresses
        string memory json = string.concat(
            '{"ClawmedyToken":"', vm.toString(address(token)),
            '","ArenaRewards":"', vm.toString(address(arena)),
            '","deployer":"', vm.toString(deployer),
            '","chainId":', vm.toString(block.chainid), '}'
        );
        vm.writeFile("../shared/addresses.json", json);
    }
}
