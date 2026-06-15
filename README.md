# From Solidity to Daml: A Confidential Auction on Canton

**The same sealed-bid auction, built twice** - once in Solidity for the EVM, once
in Daml for Canton - to show Ethereum developers what changes when the ledger
itself can keep a secret.

Sealed-bid auctions are the sharpest possible lens on this: confidentiality is
their whole point. On a public EVM you can't actually hide a bid, so you fake it
with a commit/reveal scheme, deposits, and a forfeiture rule. On Canton, a bid is
shared only with the auctioneer and the bidder - so that machinery simply
disappears. About a third of the Solidity contract is privacy scaffolding that has
no counterpart in the Daml version.

> Built as a developer-education artifact for OpenZeppelin's Canton stack: a
> worked translation of a familiar EVM pattern into Canton's Daml-based,
> privacy-preserving model - a Confidential Auction reference implementation plus
> the guide that teaches it.

## What's here

| Path | What it is | Status |
|---|---|---|
| [`solidity/`](solidity/) | First-price sealed-bid auction via commit/reveal, with Foundry tests | ✅ 12/12 tests pass |
| [`daml/`](daml/) | The same auction in Daml, private by construction, with Daml Script tests | ✅ 4/4 scripts pass |
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
disclosed at all. The Daml test proves this on a live ledger: each bidder sees one
bid, the auctioneer sees all of them.

## Run it

Prerequisites: [Foundry](https://book.getfoundry.sh/) and
[DPM](https://docs.digitalasset.com/build/3.4/dpm/dpm.html), the Daml package
manager (needs a Java 17+ runtime).

```bash
# EVM reference - 12 Foundry tests (Solidity 0.8.35)
cd solidity && forge test -vv

# Canton/Daml version - 4 Daml Script tests, including the privacy proof (Daml 3.4)
cd daml && dpm test
```

## Why this comparison matters for Canton

Canton's adoption is institution-led, and the developers it's courting are largely
Ethereum-native. The hardest part of that transition isn't syntax - it's the
mental flip from "one global, public computer" to "a network of parties with
per-party, private state." A sealed-bid auction is the smallest complete example
that forces that flip, which is why it's the one worth teaching first.

## License

MIT.
