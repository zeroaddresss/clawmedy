// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "forge-std/Script.sol";
import "../src/ClawmedyToken.sol";
import "../src/WagerEscrow.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        address deployer = vm.addr(deployerPrivateKey);

        vm.startBroadcast(deployerPrivateKey);

        ClawmedyToken token = new ClawmedyToken(deployer);
        token.mint(deployer, 1_000_000 * 1e18);

        WagerEscrow escrow = new WagerEscrow(address(token), deployer, deployer);

        vm.stopBroadcast();

        // Write addresses
        string memory json = string.concat(
            '{"ClawmedyToken":"', vm.toString(address(token)),
            '","WagerEscrow":"', vm.toString(address(escrow)),
            '","deployer":"', vm.toString(deployer),
            '","chainId":', vm.toString(block.chainid), '}'
        );
        vm.writeFile("../shared/addresses.json", json);
    }
}
