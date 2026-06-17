# From Solidity to Daml: A Confidential Auction on Canton

[![CI](https://github.com/Giri-Aayush/solidity-to-daml-confidential-auction/actions/workflows/ci.yml/badge.svg)](https://github.com/Giri-Aayush/solidity-to-daml-confidential-auction/actions/workflows/ci.yml)
[![tests](https://img.shields.io/badge/tests-12_Foundry_%2B_7_Daml-2ea043?style=flat-square)](#run-it)
[![live demo](https://img.shields.io/badge/live_demo-canton--confidential.netlify.app-a78bfa?style=flat-square&logo=netlify&logoColor=white)](https://canton-confidential.netlify.app/)
[![license](https://img.shields.io/badge/license-MIT-7c3aed?style=flat-square)](#license)

![Daml](https://img.shields.io/badge/Daml-3.4-7c3aed?style=flat-square)
![Solidity](https://img.shields.io/badge/Solidity-0.8.35-363636?style=flat-square&logo=solidity)
![Canton](https://img.shields.io/badge/Canton-CIP--0056_token_standard-8b5cf6?style=flat-square)
![Next.js](https://img.shields.io/badge/Next.js-explainer_site-000000?style=flat-square&logo=nextdotjs)

**[▶ Open the live demo](https://canton-confidential.netlify.app/)** to place a sealed bid and watch the privacy hold, no clone required.

**The same sealed-bid auction, built twice**: once in Solidity for the EVM, once
in Daml for Canton, to show Ethereum developers what changes when the ledger
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
> privacy-preserving model: a Confidential Auction reference implementation plus
> the guide that teaches it.

## New to Canton?

Never left the EVM? The 30-second orientation:

- **Canton** is a privacy-first blockchain network. Instead of one global public
  ledger, each party keeps only the contracts it is a stakeholder of: think "a network
  of synchronized private ledgers," not "one shared world computer."
- **Daml** is its smart-contract language, what you write instead of Solidity.
- **DPM** is the Daml toolchain CLI (build, test, run a local node), the rough
  analogue of Foundry's `forge`.

You don't need to install anything to follow along: open the
[live demo](https://canton-confidential.netlify.app/) and read the
[guide](guide/solidity-to-daml.md), which introduces every Canton idea by mapping it
to the Solidity one you already know. A few terms you'll meet:

| Term | What it is, for an EVM developer |
|---|---|
| **DAR** | A *Daml Archive*: the compiled package (templates + dependencies), like an EVM contract's bytecode and ABI in one file. |
| **Participant node** | Your gateway to the ledger; it hosts your parties' contracts and exposes the ledger API. |
| **Synchronizer** | The shared service that orders and commits transactions across participants (the closest thing to "the chain" that sequences blocks). |
| **CIP-0056** | The Canton Network Token Standard, defining the `Holding` and `Allocation` (delivery-versus-payment) interfaces this auction settles against. |
| **Amulet / Canton Coin** | The network's native token and registry; the production stand-in for our self-contained `AuctionCoin`. |
| **PQS** | Participant Query Store: a PostgreSQL projection of the ledger you query off-ledger (how the auctioneer discovers bids). |

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
to keep bidders honest; confidentiality lasts only until reveal, then every bid is
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

## Prerequisites

Three tools. If you already write Solidity you likely have Foundry; **DPM** (the
Daml package manager) and a **Java 17+** runtime are the Canton-side additions.

```bash
# 1. Foundry - the Solidity toolchain   (https://getfoundry.sh)
curl -L https://foundry.paradigm.xyz | bash && foundryup

# 2. Java 17+   (DPM runs on a JVM)
brew install openjdk@17                   # macOS (Homebrew)
sudo apt-get install -y openjdk-17-jdk    # Debian / Ubuntu

# 3. DPM + the Daml 3.4 SDK   (https://docs.digitalasset.com/build/3.4/dpm/dpm.html)
curl -fsSL https://get.digitalasset.com/install/install.sh | sh
dpm install 3.4.11
```

Both the Foundry and DPM installers add their `bin` directory to your shell
profile, so if `foundryup` or `dpm` is reported "not found" immediately after,
open a new terminal (or `source` your profile) and re-run that line. After that the
`make` targets locate Foundry, DPM, and Java for you, including the keg-only
Homebrew JDK on macOS, so you should not need to touch `PATH` to run the project.

## Run it

```bash
git clone https://github.com/Giri-Aayush/solidity-to-daml-confidential-auction
cd solidity-to-daml-confidential-auction

make test     # both suites: Solidity (12) + Daml (7), the same thing CI runs
make canton   # run the auction on a REAL Canton node: boots a sandbox, runs the live proof, cleans up
make web      # open the explainer site locally (Next.js on :3000)
```

The token-standard DARs are vendored in [`daml/dars/`](daml/dars/), so the Daml
build is fully offline.

<details><summary>Prefer to run the suites directly (without make)?</summary>

```bash
cd solidity && forge test -vv   # 12 Foundry tests (Solidity 0.8.35)
cd daml && dpm test             # 7 Daml Script tests, including the privacy proof
```

On macOS, running `dpm` directly (not via `make`) needs the Homebrew JDK on your
PATH first: `export PATH="$(brew --prefix openjdk@17)/bin:$PATH"`.
</details>

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
(Canton Coin) registry. The settlement orchestration is registry-agnostic (it
exercises the token-standard `Allocation` choices rather than our templates), but the
glue that mints the backing holding and forwards the proceeds to the seller is written
against the bundled coin, so on a real network that part moves to the registry's own
factory/transfer flow.

## Troubleshooting

First runs on the Canton toolchain trip on a few predictable things. Click the one
that matches:

<details>
<summary><strong><code>Unable to locate a Java Runtime</code> (or <code>dpm test</code> won't start)</strong></summary>

macOS ships a `/usr/bin/java` *stub* that exists but errors until a real JDK is
installed. Install Java 17 (see [Prerequisites](#prerequisites)). The `make` targets
then find it for you; to run `dpm` directly, put it on PATH:
`export PATH="$(brew --prefix openjdk@17)/bin:$PATH"`.

</details>

<details>
<summary><strong><code>dpm: command not found</code> (or <code>forge</code> / <code>foundryup</code>)</strong></summary>

The installer added its `bin` to your shell *profile*, not the current session. Open
a new terminal, or `source ~/.zshrc` (or `~/.bashrc`), then retry. `dpm` lives in
`~/.dpm/bin`.

</details>

<details>
<summary><strong><code>SDK_NOT_INSTALLED</code> or a version error from <code>dpm</code></strong></summary>

Run `dpm install 3.4.11` once to download the SDK the project pins.

</details>

<details>
<summary><strong><code>make canton</code>: "party already exists" or "port 6865 in use"</strong></summary>

A Canton sandbox from a previous run is still up. `make canton` boots a fresh node and
tears it down on exit; if one got orphaned, free the port with
`lsof -ti tcp:6865 | xargs kill` and re-run.

</details>

<details>
<summary><strong>What's a <code>.dar</code>?</strong></summary>

A *Daml Archive* is the compiled package (your templates plus their dependencies) in
one file: the rough equivalent of an EVM contract's bytecode and ABI bundled together.
`dpm build` produces `daml/.daml/dist/confidential-auction-1.0.0.dar`; the CIP-0056
interface DARs the project builds against are vendored in [`daml/dars/`](daml/dars/).

</details>

## Why this comparison matters for Canton

Canton's adoption is institution-led, and the developers it's courting are largely
Ethereum-native. The hardest part of that transition isn't syntax; it's the
mental flip from "one global, public computer" to "a network of parties with
per-party, private state." A sealed-bid auction is the smallest complete example
that forces that flip, which is why it's the one worth teaching first.

## Where to go next

Once the model clicks, here's the trail from this sample to a real Canton app:

- [Daml documentation](https://docs.digitalasset.com/build/3.4/) - the language, Daml Script, and the SDK.
- [Canton Network overview](https://docs.digitalasset.com/integrate/devnet/canton-network-overview/index.html) - how participants, synchronizers, and the network fit together.
- [Canton Network Token Standard (CIP-0056)](https://docs.digitalasset.com/integrate/devnet/token-standard.html) - the `Holding` / `Allocation` interfaces this auction settles against.
- [Splice](https://github.com/hyperledger-labs/splice) - the Amulet (Canton Coin) registry you would swap in for the bundled `AuctionCoin`.
- [Integrating with the Canton Network](https://docs.digitalasset.com/integrate/devnet/integrating-with-canton-network/index.html) and [validator onboarding](https://docs.dev.sync.global/validator_operator/validator_onboarding.html) - taking it to DevNet against live Canton Coin.
- [PQS](https://docs.digitalasset.com/build/3.4/component-howtos/pqs/index.html) - production bid discovery, the off-ledger query store this sample stands in for.

## License

MIT.
