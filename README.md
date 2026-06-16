# From Solidity to Daml: A Confidential Auction on Canton

[![CI](https://github.com/Giri-Aayush/solidity-to-daml-confidential-auction/actions/workflows/ci.yml/badge.svg)](https://github.com/Giri-Aayush/solidity-to-daml-confidential-auction/actions/workflows/ci.yml) [![live demo](https://img.shields.io/badge/live%20demo-canton--confidential.netlify.app-a78bfa?style=flat-square&logo=netlify&logoColor=white)](https://canton-confidential.netlify.app/) &nbsp;![daml](https://img.shields.io/badge/daml-3.4-7c3aed?style=flat-square) ![solidity](https://img.shields.io/badge/solidity-0.8.35-363636?style=flat-square)

**[▶ Open the live demo](https://canton-confidential.netlify.app/)** to place a sealed bid and watch the privacy hold, no clone required.

**The same sealed-bid auction, built twice** - once in Solidity for the EVM, once
in Daml for Canton - to show Ethereum developers what changes when the ledger
itself can keep a secret.

Sealed-bid auctions are the sharpest possible lens on this: confidentiality is
their whole point. On a public EVM you can't actually hide a bid, so you fake it
with a commit/reveal scheme, deposits, and a forfeiture rule. On Canton, a bid is
shared only with the auctioneer and the bidder, so the commit/reveal machinery
disappears and settlement collapses to one atomic delivery-versus-payment. (Daml
has no native currency, so value is held as the Canton Network Token Standard's
`Holding` and moved through its `Allocation` interface; the two contracts end up a
similar length but spend their lines very differently.)

> Built as a developer-education artifact for OpenZeppelin's Canton stack: a
> worked translation of a familiar EVM pattern into Canton's Daml-based,
> privacy-preserving model - a Confidential Auction reference implementation plus
> the guide that teaches it.

## What's here

| Path | What it is | Status |
|---|---|---|
| [`solidity/`](solidity/) | First-price sealed-bid auction via commit/reveal, with Foundry tests | ✅ 12/12 tests pass |
| [`daml/`](daml/) | The same auction in Daml, private by construction, settled through the Canton Network Token Standard (CIP-0056) with on-ledger bid rights and Daml Script tests | ✅ 7/7 scripts pass |
| [`guide/solidity-to-daml.md`](guide/solidity-to-daml.md) | The translation guide: concept map, mental-model shift, side-by-side code | 📖 read this |

**Start with the [guide](guide/solidity-to-daml.md).** Then read the two contracts
side by side with the concept-map table open.

## The one-paragraph version

In Solidity, all state is public, so a "confidential" auction commits to a
`keccak256` hash of each bid, opens a reveal window, and uses a forfeitable deposit
to keep bidders honest - confidentiality lasts only until reveal, then every bid is
public forever. In Daml, a `Bid` contract names just two stakeholders (the
auctioneer and that bidder), so no other party's ledger ever contains it. Privacy
is a property of the ledger rather than a workaround, and the losing bids are never
disclosed at all. Funds are held as the Canton Network Token Standard's `Holding`
and settled through its `Allocation` interface, so the winner pays the seller and
losers are refunded in one atomic delivery-versus-payment; one bid per bidder is
enforced on-ledger by a single-use right, not an application check. The Daml tests
prove the privacy claim by content (each bidder sees exactly their own bid, the
auctioneer sees all) and run unchanged on the in-memory ledger and on a real Canton
participant node.

## Run it

Prerequisites: [Foundry](https://book.getfoundry.sh/) and
[DPM](https://docs.digitalasset.com/build/3.4/dpm/dpm.html), the Daml package
manager (needs a Java 17+ runtime).

```bash
# EVM reference - 12 Foundry tests (Solidity 0.8.35)
cd solidity && forge test -vv

# Canton/Daml version - 7 Daml Script tests, including the privacy proof (Daml 3.4)
cd daml && dpm test
```

### On a real Canton node

The same templates run unchanged on a real participant, not just the in-memory
test ledger. `dpm sandbox` boots a full Canton node in one process, no Docker:

```bash
cd daml && dpm build
# boot Canton with the auction package loaded (gRPC ledger API on 6865)
dpm sandbox --dar .daml/dist/confidential-auction-1.0.0.dar
# in another shell: run the privacy + DvP proof against the live ledger
dpm script --dar .daml/dist/confidential-auction-1.0.0.dar \
  --script-name Test:privacyAndSettlement --ledger-host localhost --ledger-port 6865
```

On the Canton Network's DevNet you would swap the bundled registry for the Amulet
(Canton Coin) registry; the auction code is unchanged, because it targets the
token-standard interfaces rather than our templates.

## Why this comparison matters for Canton

Canton's adoption is institution-led, and the developers it's courting are largely
Ethereum-native. The hardest part of that transition isn't syntax - it's the
mental flip from "one global, public computer" to "a network of parties with
per-party, private state." A sealed-bid auction is the smallest complete example
that forces that flip, which is why it's the one worth teaching first.

## License

MIT.
