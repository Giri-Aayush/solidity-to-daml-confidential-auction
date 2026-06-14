# Solidity reference - sealed-bid auction (commit/reveal)

The EVM half of [From Solidity to Daml](../guide/solidity-to-daml.md). A
first-price sealed-bid auction that achieves bid confidentiality the only way a
public chain allows: **commit to a hash now, reveal the pre-image later.**

- [`src/SealedBidAuction.sol`](src/SealedBidAuction.sol) - the contract
- [`test/SealedBidAuction.t.sol`](test/SealedBidAuction.t.sol) - Foundry tests

## How confidentiality works here (and its limits)

1. **Commit phase** - bidders submit `keccak256(abi.encodePacked(value, secret))`
   plus a deposit. The amount is hidden behind the hash.
2. **Reveal phase** - bidders disclose `(value, secret)`. The contract re-hashes
   and checks it matches; the highest valid bid wins.
3. **Settlement** - the winning funds go to the beneficiary; everyone else
   withdraws their deposit via a pull-payment.

The catch, and the whole reason the Daml version exists:

- Secrecy is **temporary** - bids are public the moment they're revealed, forever.
- It's enforced by **economics**, not the ledger - a bidder who never reveals
  forfeits their locked deposit. That threat is the only thing making a sealed
  commitment binding.
- Roughly a third of the contract (hashing, deposits, reveal window, forfeiture)
  is scaffolding that exists *only* because EVM state is public.

## Run the tests

```bash
forge test -vv
```

Twelve tests cover the happy path, surplus-deposit refunds, under-collateralized
/ wrong-secret / zero-value reveals, rejected empty commitments, the timeline
guards, ties, non-revealer forfeiture, double-reveal protection, and a
beneficiary that reverts on receive (proving auctionEnd can't be bricked).

## Tooling note

`forge` here is the build from the Aztec toolchain (`forge 1.4.1`); any recent
Foundry works. `forge build` may emit lint *suggestions* (e.g. inline-assembly
keccak) - those are style notes, not errors.
