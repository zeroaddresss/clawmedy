// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/TestToken.sol";
import "../src/ArenaRewards.sol";

contract DeployTest is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        // 1. Deploy dummy token (deployer gets 1M TCLAW)
        TestToken token = new TestToken();

        // 2. Deploy ArenaRewards with dummy token
        ArenaRewards arena = new ArenaRewards(address(token), 1000e18, deployer);

        // 3. Grant SETTLER_ROLE to deployer
        arena.grantRole(arena.SETTLER_ROLE(), deployer);

        // 4. Fund prize pool with 100k TCLAW
        token.transfer(address(arena), 100_000e18);

        vm.stopBroadcast();

        // Write addresses
        string memory json = string.concat(
            '{"ClawmedyToken":"', vm.toString(address(token)),
            '","ArenaRewards":"', vm.toString(address(arena)),
            '","deployer":"', vm.toString(deployer),
            '","chainId":', vm.toString(block.chainid), '}'
        );
        vm.writeFile("../shared/addresses.json", json);

        console.log("TestToken:", address(token));
        console.log("ArenaRewards:", address(arena));
        console.log("Prize pool: 100,000 TCLAW");
    }
}
