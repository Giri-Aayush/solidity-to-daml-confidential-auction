# Daml version - confidential auction (private by construction)

The Canton half of [From Solidity to Daml](../guide/solidity-to-daml.md). The same
sealed-bid auction as [`../solidity`](../solidity), but with the privacy scaffolding
removed - because on Canton, a bid contract is shared only with its stakeholders.

- [`daml/ConfidentialAuction.daml`](daml/ConfidentialAuction.daml) - the templates
- [`daml/Test.daml`](daml/Test.daml) - Daml Script tests, including the privacy proof

## The model in three templates

- **`Auction`** - owned by the auctioneer; invited bidders are observers. Its
  `PlaceBid` choice creates a confidential bid; `Settle` picks the winner.
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

Four scripts: `privacyAndSettlement` (privacy + winner selection),
`nonInvitedCannotBid`, `closedBiddingRejectsLateBids`, and `cannotSettleWhileOpen`.

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
