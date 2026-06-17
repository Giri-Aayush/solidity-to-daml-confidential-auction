// SPDX-License-Identifier: MIT
pragma solidity 0.8.35;

/// @title SealedBidAuction: a first-price sealed-bid auction on the EVM.
/// @author From Solidity to Daml: a Confidential Auction on Canton
/// @notice On a public blockchain, every bid amount and every byte of calldata
///         is visible to the entire world the instant it is mined. You cannot
///         *hide* a value on-chain. The best you can do is COMMIT to a hash of
///         your bid now, then REVEAL the pre-image later: the commit/reveal
///         pattern. Three consequences fall out of this, and they are the whole
///         reason this contract is shaped the way it is:
///
///         1. Confidentiality is only *temporary*. Bids are secret during the
///            commit phase and fully public the moment they are revealed.
///         2. Privacy is enforced by *economics*, not by the ledger. A bidder
///            who never reveals forfeits their locked deposit; that threat is
///            the only thing stopping people from committing and walking away.
///         3. You need an explicit reveal phase, deposits, hashing, and a
///            timeline. None of this is the auction's business logic; it is all
///            scaffolding to work around the EVM's lack of privacy.
///
///         Contrast this with Canton/Daml (see ../daml). There, a `Bid` contract
///         is shared *only* with its signatories and observers. Competing bidders
///         never see it at all, not even a hash. Privacy is a property of the
///         ledger, so the commit/reveal machinery below simply disappears.
///
/// @dev    Known limitations of commit/reveal (inherent to the pattern, not bugs;
///         the Daml version sidesteps them by construction):
///         - Forfeited deposits are trapped FOREVER. A bidder who never reveals,
///           even an honest one whose reveal tx fails for gas or timing reasons,
///           loses their entire deposit; the ETH stays locked in the contract with
///           no recovery path (test_NonRevealerForfeitsDeposit asserts exactly this).
///         - Last-revealer advantage. Bids become public as they are revealed, so a
///           bidder revealing last can read the standing bids and decide whether to
///           reveal at all. Deposits blunt this but cannot remove the informational
///           edge. True sealed bidding needs threshold/ZK schemes, not plain hashing.
///         - Commitment privacy depends on entropy. keccak256(value, secret, bidder)
///           is only as hidden as its inputs, and the address adds none (it is
///           public): a small bid space with a low-entropy `secret` can be
///           brute-forced off-chain BEFORE reveal. Bidders must use a full-entropy
///           32-byte salt; the contract cannot enforce that on-chain.
contract SealedBidAuction {
    /// @dev The party who receives the winning bid's funds when the auction ends.
    address public immutable beneficiary;
    /// @dev Commit phase runs until `biddingEnd`; reveal phase until `revealEnd`.
    uint256 public immutable biddingEnd;
    uint256 public immutable revealEnd;

    struct Bid {
        bytes32 blindedBid; // keccak256(abi.encodePacked(value, secret, bidder))
        uint256 deposit; // funds locked at commit time
        bool revealed; // guards against double-reveal
    }

    /// @dev One blinded bid per address keeps the example readable.
    mapping(address => Bid) public bids;

    address public highestBidder;
    uint256 public highestBid;
    bool public ended;

    /// @dev Pull-payment ledger: refunds and outbid amounts accrue here and are
    ///      withdrawn explicitly, never pushed (reentrancy-safe).
    mapping(address => uint256) public pendingReturns;

    event BidCommitted(address indexed bidder, bytes32 blindedBid, uint256 deposit);
    event BidRevealed(address indexed bidder, uint256 value, bool isHighest);
    event AuctionEnded(address winner, uint256 amount);

    error TooEarly(uint256 unlockTime);
    error TooLate(uint256 closedAt);
    error AuctionAlreadyEnded();
    error AlreadyCommitted();
    error EmptyCommitment();
    error NothingCommitted();
    error AlreadyRevealed();
    error TransferFailed();

    modifier onlyBefore(uint256 t) {
        if (block.timestamp >= t) revert TooLate(t);
        _;
    }

    modifier onlyAfter(uint256 t) {
        if (block.timestamp < t) revert TooEarly(t);
        _;
    }

    /// @param biddingTime  seconds the commit phase stays open
    /// @param revealTime   seconds the reveal phase stays open (after commit)
    /// @param beneficiaryAddress  recipient of the winning funds
    constructor(uint256 biddingTime, uint256 revealTime, address beneficiaryAddress) {
        beneficiary = beneficiaryAddress;
        biddingEnd = block.timestamp + biddingTime;
        revealEnd = biddingEnd + revealTime;
    }

    /// @notice COMMIT phase. Submit keccak256(abi.encodePacked(value, secret, msg.sender)).
    /// @dev Send a deposit >= the value you intend to bid. If you later reveal a
    ///      value larger than your deposit, the bid is treated as invalid. If you
    ///      never reveal, your deposit stays locked forever; this forfeiture is
    ///      the economic glue that makes the scheme binding.
    function commit(bytes32 blindedBid) external payable onlyBefore(biddingEnd) {
        // bytes32(0) is the "no bid yet" sentinel for this mapping, so a zero
        // commitment must be rejected, otherwise it would slip past the
        // AlreadyCommitted guard (enabling a second commit that overwrites and
        // strands the first deposit) and could never be revealed.
        if (blindedBid == bytes32(0)) revert EmptyCommitment();
        if (bids[msg.sender].blindedBid != bytes32(0)) revert AlreadyCommitted();
        bids[msg.sender] = Bid({blindedBid: blindedBid, deposit: msg.value, revealed: false});
        emit BidCommitted(msg.sender, blindedBid, msg.value);
    }

    /// @notice REVEAL phase. Disclose (value, secret). If the hash matches your
    ///         commitment and your deposit covers the value, the bid counts. The
    ///         highest valid bid wins; everyone else is refunded in full.
    function reveal(uint256 value, bytes32 secret) external onlyAfter(biddingEnd) onlyBefore(revealEnd) {
        Bid storage bid = bids[msg.sender];
        if (bid.blindedBid == bytes32(0)) revert NothingCommitted();
        if (bid.revealed) revert AlreadyRevealed();
        bid.revealed = true;

        uint256 refund = bid.deposit;
        // A bid counts only if the pre-image matches, the deposit covers it, and
        // the value is positive (a zero bid is meaningless and mirrors the Daml
        // model's `amount > 0` rule; otherwise a 0 bid could never win the strict
        // `value > highestBid` check anyway).
        bool valid = bid.blindedBid == _commitmentOf(value, secret, msg.sender) && bid.deposit >= value && value > 0;

        bool isHighest = false;
        if (valid && value > highestBid) {
            // The previous leader is now outbid: make their locked value refundable.
            if (highestBidder != address(0)) {
                pendingReturns[highestBidder] += highestBid;
            }
            highestBid = value;
            highestBidder = msg.sender;
            refund -= value; // lock the winning value; refund only the surplus
            isHighest = true;
        }
        if (refund > 0) {
            pendingReturns[msg.sender] += refund;
        }
        emit BidRevealed(msg.sender, value, isHighest);
    }

    /// @notice Withdraw any funds owed to you (outbid amounts, surplus deposit,
    ///         or, for the beneficiary, the winning bid after the auction ends).
    function withdraw() external {
        uint256 amount = pendingReturns[msg.sender];
        if (amount > 0) {
            // Checks-effects-interactions: zero out first, then send. A failed
            // call reverts the whole tx, which rolls the zeroing back, so no
            // manual restore is needed.
            pendingReturns[msg.sender] = 0;
            (bool ok,) = msg.sender.call{value: amount}("");
            if (!ok) revert TransferFailed();
        }
    }

    /// @notice Close the auction. The winning bid is credited to the beneficiary's
    ///         pull-payment balance (collected via withdraw), never pushed. A
    ///         beneficiary that reverts on receive can no longer brick auctionEnd
    ///         or trap the winning funds.
    function auctionEnd() external onlyAfter(revealEnd) {
        if (ended) revert AuctionAlreadyEnded();
        ended = true;
        emit AuctionEnded(highestBidder, highestBid);
        if (highestBidder != address(0)) {
            pendingReturns[beneficiary] += highestBid;
        }
    }

    /// @notice Helper so off-chain code and tests build commitments the same way
    ///         the contract verifies them. Pass the address you will commit and
    ///         reveal from; the commitment is bound to it. (Pure; safe off-chain.)
    function hashBid(uint256 value, bytes32 secret, address bidder) external pure returns (bytes32) {
        return _commitmentOf(value, secret, bidder);
    }

    /// @dev Single source of truth for the commitment scheme, used by both
    ///      reveal() and hashBid() so they can never drift apart.
    ///      The bidder's address is part of the commitment, and that binding is
    ///      load-bearing: without it the hash is anonymous, so an attacker could
    ///      copy a victim's public commitment, over-deposit, and then front-run
    ///      the victim's reveal in the mempool (where value+secret become visible)
    ///      to seize the lead at the victim's own price. Binding `bidder` means a
    ///      stolen (value, secret) only ever re-hashes to the original committer's
    ///      commitment, never the attacker's, so the stolen reveal simply fails.
    ///      NOTE: abi.encodePacked is safe here only because all three arguments
    ///      are fixed-width (uint256, bytes32, address). With two or more *dynamic*
    ///      arguments (string/bytes) encodePacked can produce hash collisions; use
    ///      abi.encode in that case.
    function _commitmentOf(uint256 value, bytes32 secret, address bidder) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(value, secret, bidder));
    }
}
