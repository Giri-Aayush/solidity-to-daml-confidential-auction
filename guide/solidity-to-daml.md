# From Solidity to Daml: A Confidential Auction on Canton

> A guide for Ethereum developers. We build the *same* sealed-bid auction twice -
> once in Solidity for the EVM, once in Daml for Canton - and watch what happens
> to the code when the ledger itself can keep a secret.

If you write Solidity, you already know how to think about auctions, escrow, and
settlement. What you have *not* had to think about is privacy, because the EVM
doesn't offer any: every storage slot and every byte of calldata is world-readable
the moment it's mined. Canton flips that default. This guide ports one contract
across the gap so you can map what you know onto what's new.

We pick a **sealed-bid auction** on purpose, because confidentiality is its entire
reason to exist. It's the example where the EVM's transparency hurts most and where
Canton's model pays off most clearly.

---

## 1. The punchline first

Here is the same auction, both ways, measured by what the code spends its effort on:

| | Solidity (`solidity/`) | Daml (`daml/`) |
|---|---|---|
| Lines of contract logic (excl. comments) | ~90 | ~70 |
| Keeps bids secret using | commit/reveal + `keccak256` hashes | the ledger's privacy model |
| Secrecy lasts | until the reveal phase (then public forever) | permanently (losers never see winning bid) |
| Needs a deposit + forfeiture | yes - the only thing making commitments binding | no |
| Needs an explicit timeline (commit window, reveal window) | yes | no |
| Reentrancy surface | `withdraw()`, `auctionEnd()` (pull-payment pattern) | none |
| Who can read a bid | everyone, after reveal | only the auctioneer and that bidder, ever |

Roughly **a third of the Solidity contract is privacy scaffolding** - hashing,
deposits, the reveal phase, forfeiture. In Daml that scaffolding doesn't exist,
because the thing it was simulating (a bid only some parties can see) is a
primitive of the platform.

---

## 2. The mental model shift

This is the part to internalize. Everything else is mechanical.

**Solidity: one global computer, shared state, public by default.**
A contract is an object living at an address. Its storage is a single shared
database that the whole world can read. `msg.sender` tells you who called. To
hide anything, you must encrypt or hash it yourself and reveal later.

**Daml: a network of parties, per-party state, private by default.**
A contract is an immutable record on a *distributed* ledger. Each contract names
its **signatories** (who must authorize and who are bound by it) and its
**observers** (who may additionally see it). A party's "ledger" is exactly the
set of contracts where they are a signatory or observer - and *nothing else*.
There is no global readable state to leak.

So the central question changes:

- In Solidity you ask: *"who is allowed to call this function?"* (and you guard it with `require`).
- In Daml you ask: *"who needs to see this, and whose authority does it carry?"* (and you answer with `signatory` / `observer` / `controller`).

---

## 3. The concept map

Keep this table next to you while reading both contracts.

| Solidity / EVM | Daml / Canton | Notes |
|---|---|---|
| Contract at an address | `template` + a contract instance (a `ContractId`) | A template is the code; each created contract is an immutable instance. |
| Mutable storage variables | Immutable contracts; "update" = archive old + create new | There is no in-place mutation. `CloseBidding` *recreates* the Auction with `biddingOpen = False`. |
| `mapping(address => Bid) bids` | Many separate `Bid` contracts, one per bidder | No shared map; each bid is its own confidential contract. |
| `msg.sender` | `controller` of a choice | The party exercising a choice is authenticated by the ledger, not read from a transaction field. |
| `require(msg.sender == owner)` | `controller auctioneer` on the choice | Authorization is declared, not checked imperatively. |
| `require(cond, "msg")` | `assertMsg "msg" cond` | Same idea for *business-rule* checks (e.g. "bid must be positive"). |
| `function` (mutating) | consuming `choice` | Archives the contract it's exercised on, optionally creating successors. |
| `view`/`pure function` | `nonconsuming choice` or off-ledger `query` | `PlaceBid` is nonconsuming so the Auction survives repeated bids. |
| `modifier onlyOwner` | choice `controller` + `signatory` | Who can act is part of the choice's type, enforced by the engine. |
| `event Foo(...)` / `emit` | the transaction record itself + `observer`s | Stakeholders see the transaction; there's no separate event log to subscribe to for state. |
| `block.timestamp` deadlines | application-layer timing / `getTime` in scripts | Canton has time, but our Daml model gates with an explicit `biddingOpen` flag the auctioneer flips. |
| `address(this).balance`, `msg.value`, `call{value:}` | a separate asset/token model (not built into the ledger) | Daml has no native "ether." Value transfer is modeled as its own contracts (out of scope here). |
| Reentrancy guards, pull-payment | - | No external calls mid-execution; the class of bug largely doesn't arise. |
| `keccak256(abi.encodePacked(...))` commit | - | Deleted. Privacy is native, so there is nothing to commit to. |

---

## 4. Authorization: `require` vs. `signatory`/`controller`

In Solidity, authorization is an imperative check you remember to write:

```solidity
function commit(bytes32 blindedBid) external payable onlyBefore(biddingEnd) {
    if (bids[msg.sender].blindedBid != bytes32(0)) revert AlreadyCommitted();
    // ...anyone who passes the guards may call
}
```

In Daml, authorization is *part of the type of the choice*. You cannot exercise
`PlaceBid` as anyone other than the named controller, and the resulting `Bid`
cannot exist unless both its signatories authorized it:

```daml
nonconsuming choice PlaceBid : ContractId Bid
  with bidder : Party; amount : Decimal
  controller bidder                       -- only `bidder` can do this
  do
    assertMsg "bidder must be invited" (bidder `elem` invited)
    create Bid with auctioneer, auctionId, bidder, item, amount   -- signed by [auctioneer, bidder]
```

The subtle, powerful part: the choice body runs with the **authority of the
Auction's signatory (the auctioneer) plus the controller (the bidder)** - exactly
the two signatures the `Bid` needs. This *delegated authority* is how a single
bidder transaction can create a contract co-signed by the auctioneer, without the
auctioneer being online. There is no Solidity equivalent; it's the Daml feature
that replaces a lot of approval/allowance boilerplate.

---

## 5. Where the privacy actually comes from

This is the one screenful to remember. In Daml:

```daml
template Bid
  with
    auctioneer : Party
    bidder : Party
    item : Text
    amount : Decimal
  where
    signatory auctioneer, bidder    -- and NOBODY else is named here
```

Because only `auctioneer` and `bidder` are stakeholders, **no other party's
ledger ever contains this contract.** A competing bidder cannot `fetch` it, cannot
`query` it, cannot learn it exists. Our test asserts exactly this against a running
ledger:

```daml
aliceView <- query @Bid alice
case aliceView of
  [(_, bid)] -> bid.bidder === alice   -- Alice sees exactly one bid, and it's hers
  _ -> abort "Alice should see only her own bid"
auctioneerView <- query @Bid auctioneer
length auctioneerView === 3            -- the auctioneer, a signatory on all, sees every bid
```

Contrast the Solidity contract, which can only *delay* disclosure: bids are hashes
until the reveal phase, then permanently public. On Canton the losing bids are
*never* disclosed - `AuctionResult` is observed only by the winner, so losers don't
even learn the clearing price. That's not extra work; it's the absence of work.

---

## 6. Where the logic lives: on-chain loops vs. off-ledger orchestration

A reflex to unlearn: in Solidity you often loop over all participants on-chain.
In Daml a choice can only see contracts explicitly handed to it, because privacy
means there's no global set to iterate. So winner selection works in two moves:

1. **Off-ledger**, the auctioneer (the only party who can see every `Bid`) gathers
   the contract ids - in production via the Ledger API / a Canton app; in our test
   via `query @Bid`.
2. **On-ledger**, it passes them to `Settle`, which fetches each, validates it
   belongs to the auction, picks the max, clears the bids, and records the result:

```daml
choice Settle : ContractId AuctionResult
  with bidCids : [ContractId Bid]
  controller auctioneer
  do
    assertMsg "close bidding before settling" (not biddingOpen)
    -- de-duplicate the caller's list so a repeated id can't double-clear a bid
    let uniqueCids = foldl (\seen c -> if c `elem` seen then seen else seen <> [c]) [] bidCids
    bids <- forA uniqueCids \cid -> do
      bid <- fetch cid
      assertMsg "bid does not belong to this auction"
        (bid.auctioneer == auctioneer && bid.auctionId == auctionId)
      pure (cid, bid)
    case sortOn (\(_, bid) -> negate bid.amount) bids of
      [] -> abort "cannot settle an auction with no bids"
      ((_, winningBid) :: _) -> do
        forA bids \(cid, _) -> exercise cid Clear   -- clear every bid
        create AuctionResult with
          auctioneer; item; winner = winningBid.bidder; winningAmount = winningBid.amount
```

Note `exercise cid Clear` archives a `Bid`. The auctioneer can do this *alone* even
though the bid is co-signed, because the bidder pre-authorized the `Clear` choice by
signing the bid in the first place. That's the Daml answer to "how do I let one
party clean up state another party created."

---

## 7. Things that simply vanished

If you came from the Solidity file, here's what you'll notice is *gone*, and why:

- **The commit hash (`keccak256`)** - nothing to hide-then-reveal; the bid is born private.
- **The reveal phase and its deadline** - there is no reveal, so no second window.
- **Deposits and forfeiture** - these existed only to make a hidden commitment
  *binding* and to punish non-revealers. A Daml bid is a real, authorized contract
  the instant it's created; there's nothing to enforce after the fact.
- **`pendingReturns` / `withdraw()` / pull-payments** - no value is escrowed in the
  contract, and there are no mid-execution external calls, so the reentrancy-driven
  pull-payment pattern isn't needed.
- **The `ended` flag and `auctionEnd()` transfer** - settlement is a single atomic
  choice; there's no "anyone can poke it after the deadline" finalizer.

What's left in the Daml file is the auction and nothing but the auction.

---

## 8. A word on what *doesn't* port cleanly

Honesty matters more than a clean story:

- **Value/assets.** Solidity has native ETH (`msg.value`, balances). Daml has no
  built-in currency; tokens are modeled as their own contracts (e.g. a `Holding`
  with a transfer choice). A production auction would settle payment against such a
  token; we left it out to keep the privacy lesson front-and-center.
- **Time.** Our model uses an explicit `biddingOpen` flag the auctioneer flips,
  rather than `block.timestamp`. Canton does have ledger time; gating bids on it is
  a reasonable next iteration.
- **Discovery.** "Who are the bidders?" is an input here (the `invited` list). On a
  public EVM anyone can call; on Canton, parties and their visibility are managed
  deliberately - which is a feature for institutional use cases, and a difference to
  design around for open ones.

---

## 9. Run both yourself

```bash
# Solidity - 12 tests
cd solidity && forge test -vv

# Daml - 5 scripts, including the privacy proof
cd daml && daml test
```

The Daml `privacyAndSettlement` script is the one to read: it places three bids
from three parties and asserts, on a live ledger, that each bidder sees exactly one
bid while the auctioneer sees all three. That single assertion is the thing the
entire Solidity commit/reveal dance is trying to approximate.

---

## TL;DR for the EVM developer

1. Stop thinking "global shared state I must guard." Start thinking "per-contract
   stakeholders who can see it."
2. `msg.sender`-checks become `controller`; ownership becomes `signatory`.
3. Mutation becomes archive-and-recreate.
4. Privacy you used to fake with commit/reveal is now a property you *declare*.
5. Logic that looped over everyone on-chain moves to an app that feeds a choice
   only the contracts it's allowed to see.
