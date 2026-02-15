// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "../helpers/TestSetup.sol";

contract ClawmedyTokenTest is TestSetup {
    function testName() public view {
        assertEq(token.name(), "Clawmedy");
    }

    function testSymbol() public view {
        assertEq(token.symbol(), "CLAW");
    }

    function testMint() public {
        uint256 balBefore = token.balanceOf(admin);
        vm.prank(admin);
        token.mint(admin, 1000 ether);
        assertEq(token.balanceOf(admin), balBefore + 1000 ether);
    }

    function testMintNonOwnerReverts() public {
        vm.prank(challenger);
        vm.expectRevert(abi.encodeWithSelector(Ownable.OwnableUnauthorizedAccount.selector, challenger));
        token.mint(challenger, 1000 ether);
    }

    function testTransfer() public {
        uint256 amount = 500 ether;
        uint256 challengerBal = token.balanceOf(challenger);

        vm.prank(challenger);
        token.transfer(user2, amount);

        assertEq(token.balanceOf(challenger), challengerBal - amount);
    }

    function testApproveAndTransferFrom() public {
        uint256 amount = 200 ether;

        vm.prank(challenger);
        token.approve(user2, amount);

        vm.prank(user2);
        token.transferFrom(challenger, user2, amount);

        assertEq(token.balanceOf(user2), 10_000 ether + amount);
    }
}
