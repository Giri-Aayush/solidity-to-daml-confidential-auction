// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title SealedBidAuction — a first-price sealed-bid auction on the EVM.
/// @author From Solidity to Daml — a Confidential Auction on Canton
/// @notice On a public blockchain, every bid amount and every byte of calldata
///         is visible to the entire world the instant it is mined. You cannot
///         *hide* a value on-chain. The best you can do is COMMIT to a hash of
///         your bid now, then REVEAL the pre-image later — the commit/reveal
///         pattern. Three consequences fall out of this, and they are the whole
///         reason this contract is shaped the way it is:
///
///         1. Confidentiality is only *temporary*. Bids are secret during the
///            commit phase and fully public the moment they are revealed.
///         2. Privacy is enforced by *economics*, not by the ledger. A bidder
///            who never reveals forfeits their locked deposit — that threat is
///            the only thing stopping people from committing and walking away.
///         3. You need an explicit reveal phase, deposits, hashing, and a
///            timeline. None of this is the auction's business logic; it is all
///            scaffolding to work around the EVM's lack of privacy.
///
///         Contrast this with Canton/Daml (see ../daml). There, a `Bid` contract
///         is shared *only* with its signatories and observers. Competing bidders
///         never see it at all — not even a hash. Privacy is a property of the
///         ledger, so the commit/reveal machinery below simply disappears.
contract SealedBidAuction {
    /// @dev The party who receives the winning bid's funds when the auction ends.
    address public immutable beneficiary;
    /// @dev Commit phase runs until `biddingEnd`; reveal phase until `revealEnd`.
    uint256 public immutable biddingEnd;
    uint256 public immutable revealEnd;

    struct Bid {
        bytes32 blindedBid; // keccak256(abi.encodePacked(value, secret))
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

    /// @notice COMMIT phase. Submit keccak256(abi.encodePacked(value, secret)).
    /// @dev Send a deposit >= the value you intend to bid. If you later reveal a
    ///      value larger than your deposit, the bid is treated as invalid. If you
    ///      never reveal, your deposit stays locked forever — this forfeiture is
    ///      the economic glue that makes the scheme binding.
    function commit(bytes32 blindedBid) external payable onlyBefore(biddingEnd) {
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
        bool valid = bid.blindedBid == keccak256(abi.encodePacked(value, secret)) && bid.deposit >= value;

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

    /// @notice Withdraw any refunds owed to you (outbid amounts, surplus deposit).
    function withdraw() external {
        uint256 amount = pendingReturns[msg.sender];
        if (amount > 0) {
            pendingReturns[msg.sender] = 0;
            (bool ok,) = msg.sender.call{value: amount}("");
            if (!ok) {
                pendingReturns[msg.sender] = amount; // restore on failure
                revert TransferFailed();
            }
        }
    }

    /// @notice Close the auction and pay the beneficiary the winning bid.
    function auctionEnd() external onlyAfter(revealEnd) {
        if (ended) revert AuctionAlreadyEnded();
        ended = true;
        emit AuctionEnded(highestBidder, highestBid);
        if (highestBidder != address(0)) {
            (bool ok,) = beneficiary.call{value: highestBid}("");
            if (!ok) revert TransferFailed();
        }
    }

    /// @notice Helper so off-chain code and tests build commitments the same way
    ///         the contract verifies them. (Pure; safe to call off-chain.)
    function hashBid(uint256 value, bytes32 secret) external pure returns (bytes32) {
        return keccak256(abi.encodePacked(value, secret));
    }
}
