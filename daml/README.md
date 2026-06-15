# Daml version - confidential auction (private by construction)

The Canton half of [From Solidity to Daml](../guide/solidity-to-daml.md). The same
sealed-bid auction as [`../solidity`](../solidity), but with the privacy scaffolding
removed (a bid is shared only with its stakeholders) and settlement modeled as an
atomic delivery-versus-payment that moves real funds.

- [`daml/ConfidentialAuction.daml`](daml/ConfidentialAuction.daml) - the templates
- [`daml/Test.daml`](daml/Test.daml) - Daml Script tests, including the privacy proof

## The model in four templates

- **`Holding`** - a minimal fungible token: a self-contained stand-in for the Canton
  Network Token Standard ([CIP-0056](https://github.com/canton-foundation/cips/blob/main/cip-0056/cip-0056.md))
  `Holding` interface / Canton Coin. Daml has no native currency, so value is an
  explicit contract.
- **`Auction`** - owned by the auctioneer; invited bidders are observers. `PlaceBid`
  seals a bid *and locks its amount* from a holding; `Settle` runs an atomic
  delivery-versus-payment (the winner pays the beneficiary, losers are refunded, all
  in one transaction) and is time-bounded by `settleBy`.
- **`Bid`** - signed by the auctioneer *and one bidder*, and nobody else. That two-
  party signatory set is the entire privacy mechanism: no other party's ledger
  contains it.
- **`AuctionResult`** - observed only by the winner, so losing bidders never learn
  the clearing price.

## What to read first

`Test.daml`'s `privacyAndSettlement` script proves the headline claim on a live
ledger:

```daml
aliceView <- query @Bid alice
case aliceView of
  [(_, bid)] -> bid.bidder === alice   -- Alice sees exactly one bid, and it's hers
  _ -> abort "Alice should see only her own bid"
auctioneerView <- query @Bid auctioneer
length auctioneerView === 3            -- the auctioneer, signatory on all, sees three
```

That assertion is what the entire Solidity commit/reveal scheme is trying to
approximate.

## Run the tests

```bash
dpm build
dpm test
```

Five scripts: `privacyAndSettlement` (privacy + atomic DvP), `nonInvitedCannotBid`,
`closedBiddingRejectsLateBids`, `cannotSettleWhileOpen`, and
`settlementRespectsDeadline`.

## Setup notes

- Built and tested against **Daml 3.4.11** with **DPM** (the Daml package manager).
  Install via `curl -sSL https://get.digitalasset.com/install/install.sh | sh`, then
  `dpm install 3.4.11`; needs a **Java 17+** runtime on `PATH`.
- Daml 3 removed contract keys (their uniqueness guarantee is incompatible with
  Canton's multi-synchronizer design), so one-bid-per-bidder is not enforced
  on-ledger here; an app enforces that off-ledger. Templates and tests share one
  package for readability (production would split them so daml-script isn't
  uploaded to the participant).
- This runs on Daml's in-memory script ledger. The same templates deploy to a
  Canton participant node unchanged - Canton is where the per-party privacy this
  model relies on is actually enforced across organizations.
- **How this maps to production Canton** (deliberate simplifications):
  - *Token:* `Holding` is operator-issued for self-containment; production settles
    against the real CIP-0056 token standard (Holding + Allocation/DvP) through a
    token registry, using explicit *disclosure* (disclosed contracts) rather than
    the operator seeing every holding.
  - *Discovery:* here the auctioneer is handed bid `ContractId`s directly; production
    discovers them off-ledger by querying the Active Contract Set with
    [PQS](https://docs.digitalasset.com/build/3.4/sdlc-howtos/applications/develop/pqs/index.html)
    (a PostgreSQL view of the ledger), since Daml 3 has no key lookups.
  - *Identity:* `auctionId` is a plain `Text`; production uses a guaranteed-unique id.
  - *Divulgence:* a non-stakeholder never receives a `Bid`, so it cannot see one. (A
    party can learn a contract by *witnessing* a transaction that uses it, but no
    bidder witnesses another's bid here.)
