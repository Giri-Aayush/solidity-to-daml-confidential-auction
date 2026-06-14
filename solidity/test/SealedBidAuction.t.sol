// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {SealedBidAuction} from "../src/SealedBidAuction.sol";

contract SealedBidAuctionTest is Test {
    SealedBidAuction internal auction;

    address internal beneficiary = makeAddr("beneficiary");
    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");
    address internal carol = makeAddr("carol");

    uint256 internal constant BIDDING_TIME = 1 days;
    uint256 internal constant REVEAL_TIME = 1 days;

    function setUp() public {
        auction = new SealedBidAuction(BIDDING_TIME, REVEAL_TIME, beneficiary);
        vm.deal(alice, 100 ether);
        vm.deal(bob, 100 ether);
        vm.deal(carol, 100 ether);
    }

    function _commitment(uint256 value, bytes32 secret) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(value, secret));
    }

    function _commit(address who, uint256 value, bytes32 secret, uint256 deposit) internal {
        vm.prank(who);
        auction.commit{value: deposit}(_commitment(value, secret));
    }

    /// Full happy path: three sealed bids, highest valid bid wins, beneficiary is
    /// paid exactly the winning amount, and losers reclaim their full deposits.
    function test_HighestRevealedBidWins() public {
        bytes32 sA = keccak256("alice-secret");
        bytes32 sB = keccak256("bob-secret");
        bytes32 sC = keccak256("carol-secret");

        // Commit phase: deposits equal intended bids here, but they need not.
        _commit(alice, 3 ether, sA, 3 ether);
        _commit(bob, 5 ether, sB, 5 ether);
        _commit(carol, 4 ether, sC, 4 ether);

        // Move into the reveal phase.
        vm.warp(block.timestamp + BIDDING_TIME);

        vm.prank(alice);
        auction.reveal(3 ether, sA);
        vm.prank(bob);
        auction.reveal(5 ether, sB);
        vm.prank(carol);
        auction.reveal(4 ether, sC);

        assertEq(auction.highestBidder(), bob, "bob should lead with 5 ether");
        assertEq(auction.highestBid(), 5 ether);

        // Close the auction. The winning bid is credited to the beneficiary's
        // pull-payment balance (collected via withdraw), not pushed.
        vm.warp(block.timestamp + REVEAL_TIME);
        auction.auctionEnd();

        assertTrue(auction.ended());
        assertEq(auction.pendingReturns(beneficiary), 5 ether, "beneficiary credited winning bid");
        uint256 beneficiaryBefore = beneficiary.balance;
        vm.prank(beneficiary);
        auction.withdraw();
        assertEq(beneficiary.balance, beneficiaryBefore + 5 ether, "beneficiary withdraws winning bid");

        // Losers withdraw full deposits; winner's funds are gone to beneficiary.
        uint256 aliceBefore = alice.balance;
        vm.prank(alice);
        auction.withdraw();
        assertEq(alice.balance, aliceBefore + 3 ether, "alice fully refunded");

        uint256 carolBefore = carol.balance;
        vm.prank(carol);
        auction.withdraw();
        assertEq(carol.balance, carolBefore + 4 ether, "carol fully refunded");

        // Winner has nothing to withdraw (deposit == bid == paid out).
        uint256 bobBefore = bob.balance;
        vm.prank(bob);
        auction.withdraw();
        assertEq(bob.balance, bobBefore, "winner has no surplus");
    }

    /// Over-depositing then bidding lower: the surplus is refundable, and the
    /// secret value is hidden behind the hash until reveal.
    function test_SurplusDepositIsRefunded() public {
        bytes32 sA = keccak256("alice-secret");
        _commit(alice, 2 ether, sA, 10 ether); // deposit 10, bid only 2

        vm.warp(block.timestamp + BIDDING_TIME);
        vm.prank(alice);
        auction.reveal(2 ether, sA);

        // Alice leads (only bidder). Surplus 8 ether is immediately refundable.
        assertEq(auction.pendingReturns(alice), 8 ether);

        uint256 before = alice.balance;
        vm.prank(alice);
        auction.withdraw();
        assertEq(alice.balance, before + 8 ether);
    }

    /// A reveal whose value exceeds the deposit is invalid and cannot win.
    function test_UndercollateralizedRevealIsInvalid() public {
        bytes32 sA = keccak256("alice-secret");
        bytes32 sB = keccak256("bob-secret");

        _commit(alice, 100 ether, sA, 1 ether); // claims 100, only funded 1
        _commit(bob, 2 ether, sB, 2 ether);

        vm.warp(block.timestamp + BIDDING_TIME);
        vm.prank(alice);
        auction.reveal(100 ether, sA); // invalid: deposit < value
        vm.prank(bob);
        auction.reveal(2 ether, sB);

        assertEq(auction.highestBidder(), bob, "under-collateralized bid cannot win");
        assertEq(auction.highestBid(), 2 ether);

        // Alice's full deposit is refundable since her bid never counted.
        assertEq(auction.pendingReturns(alice), 1 ether);
    }

    /// A wrong secret fails the hash check: the bid is ignored but the deposit
    /// is still returned (you revealed, just incorrectly).
    function test_WrongSecretFailsHashCheck() public {
        bytes32 sA = keccak256("alice-secret");
        _commit(alice, 3 ether, sA, 3 ether);

        vm.warp(block.timestamp + BIDDING_TIME);
        vm.prank(alice);
        auction.reveal(3 ether, keccak256("wrong-secret"));

        assertEq(auction.highestBidder(), address(0), "no valid leader");
        assertEq(auction.pendingReturns(alice), 3 ether, "deposit refundable");
    }

    /// Committing during the reveal phase is rejected by the timeline.
    function test_CannotCommitAfterBiddingEnds() public {
        vm.warp(block.timestamp + BIDDING_TIME);
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(SealedBidAuction.TooLate.selector, auction.biddingEnd()));
        auction.commit{value: 1 ether}(_commitment(1 ether, keccak256("s")));
    }

    /// Revealing before the commit phase closes is rejected by the timeline.
    function test_CannotRevealBeforeRevealPhase() public {
        bytes32 sA = keccak256("alice-secret");
        _commit(alice, 1 ether, sA, 1 ether);

        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSelector(SealedBidAuction.TooEarly.selector, auction.biddingEnd()));
        auction.reveal(1 ether, sA);
    }

    /// A bidder who commits but never reveals forfeits their locked deposit —
    /// the economic mechanism that keeps the sealed phase honest.
    function test_NonRevealerForfeitsDeposit() public {
        bytes32 sA = keccak256("alice-secret");
        _commit(alice, 7 ether, sA, 7 ether); // commits, then ghosts

        vm.warp(block.timestamp + BIDDING_TIME + REVEAL_TIME);
        auction.auctionEnd();

        // Alice never revealed: nothing is owed to her, and the 7 ether is
        // actually trapped in the contract (the intended forfeiture).
        assertEq(auction.pendingReturns(alice), 0);
        assertEq(auction.highestBidder(), address(0));
        assertEq(address(auction).balance, 7 ether, "forfeited deposit stays in the contract");
        assertEq(auction.pendingReturns(beneficiary), 0, "no winner, nothing credited to beneficiary");
        assertEq(beneficiary.balance, 0);
    }

    function test_DoubleRevealReverts() public {
        bytes32 sA = keccak256("alice-secret");
        _commit(alice, 3 ether, sA, 3 ether);

        vm.warp(block.timestamp + BIDDING_TIME);
        vm.prank(alice);
        auction.reveal(3 ether, sA);

        vm.prank(alice);
        vm.expectRevert(SealedBidAuction.AlreadyRevealed.selector);
        auction.reveal(3 ether, sA);
    }

    /// A zero commitment is rejected outright — it would otherwise collide with
    /// the "no bid yet" sentinel and let a bidder strand their own deposit.
    function test_RejectsEmptyCommitment() public {
        vm.prank(alice);
        vm.expectRevert(SealedBidAuction.EmptyCommitment.selector);
        auction.commit{value: 1 ether}(bytes32(0));
    }

    /// A revealed bid of zero is invalid: it cannot win and the deposit is fully
    /// refundable (mirrors the Daml model's amount > 0 rule).
    function test_ZeroValueBidIsInvalid() public {
        bytes32 sA = keccak256("alice-secret");
        _commit(alice, 0, sA, 1 ether); // commitment to value 0, deposit 1 ether

        vm.warp(block.timestamp + BIDDING_TIME);
        vm.prank(alice);
        auction.reveal(0, sA);

        assertEq(auction.highestBidder(), address(0), "zero bid cannot win");
        assertEq(auction.pendingReturns(alice), 1 ether, "deposit fully refundable");
    }

    /// On a tie, the first valid revealer keeps the lead; the later equal bidder
    /// is refunded in full and the books stay balanced.
    function test_TieKeepsFirstRevealer() public {
        bytes32 sA = keccak256("alice-secret");
        bytes32 sB = keccak256("bob-secret");
        _commit(alice, 5 ether, sA, 5 ether);
        _commit(bob, 5 ether, sB, 5 ether);

        vm.warp(block.timestamp + BIDDING_TIME);
        vm.prank(alice);
        auction.reveal(5 ether, sA);
        vm.prank(bob);
        auction.reveal(5 ether, sB); // equal bid does NOT unseat Alice

        assertEq(auction.highestBidder(), alice, "first revealer wins the tie");
        assertEq(auction.highestBid(), 5 ether);
        assertEq(auction.pendingReturns(bob), 5 ether, "tied loser fully refunded");
        assertEq(auction.pendingReturns(alice), 0, "winner's value is locked");

        vm.warp(block.timestamp + REVEAL_TIME);
        auction.auctionEnd();
        assertEq(auction.pendingReturns(beneficiary), 5 ether);

        // Solvency: deposits in (10 ether) == claimable out (Bob 5 + beneficiary 5).
        assertEq(address(auction).balance, 10 ether);
    }

    /// A beneficiary that reverts on receive can no longer brick the auction:
    /// auctionEnd succeeds (pull-payment), and losers can still withdraw.
    function test_RevertingBeneficiaryDoesNotBrick() public {
        RevertingReceiver evil = new RevertingReceiver();
        SealedBidAuction a = new SealedBidAuction(BIDDING_TIME, REVEAL_TIME, address(evil));

        bytes32 sA = keccak256("alice-secret");
        bytes32 sB = keccak256("bob-secret");
        // NB: build the commitment with the pure helper, not a.hashBid(), so the
        // external hashBid call doesn't consume the vm.prank before commit().
        vm.prank(alice);
        a.commit{value: 3 ether}(_commitment(3 ether, sA));
        vm.prank(bob);
        a.commit{value: 5 ether}(_commitment(5 ether, sB));

        vm.warp(block.timestamp + BIDDING_TIME);
        vm.prank(alice);
        a.reveal(3 ether, sA);
        vm.prank(bob);
        a.reveal(5 ether, sB);

        vm.warp(block.timestamp + REVEAL_TIME);
        a.auctionEnd(); // does NOT revert despite the reverting beneficiary
        assertTrue(a.ended());
        assertEq(a.pendingReturns(address(evil)), 5 ether, "winning bid is safely credited");

        // The losing bidder is unaffected and can still withdraw.
        uint256 aliceBefore = alice.balance;
        vm.prank(alice);
        a.withdraw();
        assertEq(alice.balance, aliceBefore + 3 ether);
    }
}

/// Beneficiary that rejects all incoming ETH — used to prove auctionEnd can't be
/// bricked by a hostile/contract beneficiary now that payment is pull-based.
contract RevertingReceiver {
    receive() external payable {
        revert("I refuse funds");
    }
}
