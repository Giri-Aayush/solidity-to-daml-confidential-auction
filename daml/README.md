# Daml version: confidential auction (private by construction)

The Canton half of [From Solidity to Daml](../guide/solidity-to-daml.md). The same
sealed-bid auction as [`../solidity`](../solidity), but with the privacy scaffolding
removed (a bid is shared only with its stakeholders) and settlement modeled as an
atomic delivery-versus-payment against the **Canton Network Token Standard**
([CIP-0056](https://docs.digitalasset.com/integrate/devnet/token-standard.html)).

- [`daml/ConfidentialAuction.daml`](daml/ConfidentialAuction.daml): the templates
- [`daml/Test.daml`](daml/Test.daml): Daml Script tests, including the privacy proof
- [`dars/`](dars/): the prebuilt CIP-0056 interface DARs we build against

## The model

The auction is written against the real token-standard interfaces, and ships a
minimal registry that implements them so the sample builds and runs offline:

- **`AuctionCoin`**: a holding that *implements the CIP-0056 `Holding` interface*,
  minted by a `registry` party that is separate from the auctioneer. Self-contained
  stand-in for Canton Coin; on a real network this is the Amulet registry's holding
  instead. The auctioneer never mints or moves coins directly: it locks a bid's funds
  and forwards proceeds only through the coin's own registry-authorized choices
  (`LockForBid`, `TransferTo`).
- **`CoinAllocation`**: *implements the CIP-0056 `Allocation` interface*, the
  standard's atomic-DvP primitive. Its `Allocation_ExecuteTransfer` pays the
  receiver; `Allocation_Cancel` / `_Withdraw` refund the sender.
- **`AuctionTerms`**: the public terms (item, beneficiary, deadline, `biddingOpen`),
  signed by the auctioneer alone and observed by *no* bidder. Bidders reach it only by
  explicit disclosure (for `PlaceBid` / `FetchTerms`), so the participant set never
  leaks. `Settle` lives here and, in one transaction, executes the winning allocation
  and cancels the losers, time-bounded by `settleBy`.
- **`AuctionRoster`**: the invited list, signed by the auctioneer alone and observed by
  no bidder, so the roster stays private. `IssueBidRight` mints each invited bidder
  their own `BidRight`; `Settle` takes the roster to confirm every settled bid came
  from an invited party.
- **`BidRight`**: a single-use, per-bidder invitation, signed by the auctioneer and
  observed only by that one bidder. `PlaceBid` lives here and consumes it (so it is
  good for exactly one bid: one bid per *right*, enforced on-ledger), reading the live
  terms from a disclosed `AuctionTerms` so the bidder never witnesses the roster. One
  bid per *bidder* then holds as long as the auctioneer issues one right each (Canton
  has no *unique* contract keys to enforce that), and `Settle` re-checks it.
- **`Bid`**: signed by the auctioneer *and one bidder*, and nobody else. That
  two-party signatory set is the entire privacy mechanism. Co-signing is also what
  lets the auctioneer settle while the bidder is offline: the bidder's authority,
  which the standard `Allocation` choices require, is present because they signed.
- **`AuctionResult`**: observed only by the winner, so losing bidders never learn
  the clearing price.

Bids are allocated to the auctioneer (the settlement executor), never to the
beneficiary, so the seller never sees a losing bid; at settlement the winning
proceeds are forwarded to the beneficiary atomically.

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

Eight scripts: `privacyAndSettlement` (privacy + token-standard DvP),
`oneBidPerBidder` (on-ledger single bid), `nonInvitedCannotBid`,
`closedBiddingRejectsLateBids`, `cannotSettleWhileOpen`, `settlementRespectsDeadline`,
`deadlineReclaim` (bidder reclaim after the deadline), and `explicitDisclosure`
(using a disclosed contract).

## Run it on a real Canton node

`dpm test` uses the in-memory script ledger. The *same* DAR runs unchanged on a real
Canton participant. `dpm sandbox` boots a full Canton node in one process, no Docker:

```bash
dpm build
# boot Canton with the auction package loaded; gRPC ledger API on 6865
dpm sandbox --dar .daml/dist/confidential-auction-1.0.0.dar
# in another shell, run the proof against the live ledger:
dpm script --dar .daml/dist/confidential-auction-1.0.0.dar \
  --script-name Test:privacyAndSettlement --ledger-host localhost --ledger-port 6865
```

### Discovery with PQS

In production the auctioneer does not keep the bid `ContractId`s in memory; it
discovers them by querying the Participant Query Store, a PostgreSQL projection of
the ledger. `dpm pqs` runs the exporter against the same node:

```bash
dpm pqs pipeline ledger postgres-document \
  --source-ledger-host localhost --source-ledger-port 6865 --source-ledger-auth NoAuth \
  --target-postgres-host localhost --target-postgres-database pqs_auction \
  --target-postgres-username "$USER" --target-postgres-password "<password>" \
  --pipeline-ledger-start Genesis
```

The bids are then a SQL query away (each party sees only what it is a stakeholder of):

```sql
SELECT payload->>'bidder' AS bidder, payload->>'amount' AS amount
FROM __contracts c JOIN __contract_tpe t ON c.tpe_pk = t.pk
WHERE t.entity_name = 'Bid';
```

## Setup notes

- Built and tested against **Daml 3.4.11** with **DPM** (the Daml package manager).
  Install via `curl -fsSL https://get.digitalasset.com/install/install.sh | sh`, then
  `dpm install 3.4.11`; needs a **Java 17+** runtime on `PATH`.
- The token-standard interface DARs (`splice-api-token-{metadata,holding,allocation}-v1`,
  the prebuilt `1.0.0` releases from
  [hyperledger-labs/splice](https://github.com/hyperledger-labs/splice/tree/main/daml/dars))
  are vendored under [`dars/`](dars/) and listed as `data-dependencies`, so the build
  is offline and reproducible. They are Daml-LF 2.1, which `daml.yaml` targets.
- Templates and tests share one package for readability (production would split them
  so daml-script is never uploaded to the participant).

### How this maps to production Canton (remaining simplifications)

- *Registry:* the registry (token issuer) is a SEPARATE party from the auctioneer
  (operator and settlement executor). Only the registry mints `AuctionCoin`; the
  auctioneer moves funds only through the registry-authorized coin choices
  (`LockForBid`, `TransferTo`) and the standard `Allocation`, so no one party can both
  issue money and run the auction. Our registry is still a minimal stand-in (single
  instrument, no fees or governance); on the Canton Network you settle against the live
  Amulet (Canton Coin) registry through its `AllocationFactory`, but the issuer/operator
  split this sample shows is the real one.
- *Auctioneer liveness:* settlement depends on the auctioneer settling before
  `settleBy` and including every bid in `Settle`. If it does not, a bidder is not
  stuck: once `settleBy` passes they call `Bid.ReclaimAfterDeadline` to withdraw their
  own funds without the auctioneer (the reclaim and settlement windows are disjoint).
- *Network:* `dpm sandbox` is a single participant. Cross-organization privacy is
  enforced when each party is hosted on its own participant across a synchronizer;
  the per-party visibility this sample relies on is the same mechanism.
- *Discovery:* here the auctioneer is handed bid `ContractId`s directly; production
  discovers them off-ledger by querying the Active Contract Set with
  [PQS](https://docs.digitalasset.com/build/3.4/component-howtos/pqs/index.html)
  (`dpm pqs`, a PostgreSQL view of the ledger), since Canton has no unique-key lookups.
- *Identity:* `auctionId` is a plain `Text`; production uses a guaranteed-unique id.
- *Divulgence:* a non-stakeholder never receives a `Bid`, so it cannot see one. A
  party can learn a contract by *witnessing* a transaction that uses it, but no
  bidder witnesses another's bid here; explicit disclosure (the `explicitDisclosure`
  script) is the controlled way to hand a contract to a non-stakeholder.
