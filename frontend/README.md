# Frontend — the interactive privacy demo + landing

A Next.js site that makes the project's thesis tangible: place a sealed bid and
watch, side by side, what each party is — and isn't — allowed to read.

The centerpiece is four **ledger views** (Alice, Bob, Carol, Auctioneer). When a
bidder seals a bid it appears in full for that bidder and the auctioneer, and as a
**redaction bar** for everyone else. Flip the **Canton ⇄ EVM** toggle and every
redaction drops at once — the difference between a private ledger and a public one,
in a click.

## How it stays honest

The demo runs on a simulated, in-memory ledger ([`src/lib/ledger.ts`](src/lib/ledger.ts))
that mirrors the real Daml templates in [`../daml`](../daml). Crucially, visibility
is decided the same way Daml decides it — by a contract's **stakeholders**
(`signatory` + `observer`) — not by an ad-hoc UI flag:

```ts
export function visibleBid(bid, viewer, mode) {
  if (mode === "canton")
    return bidStakeholders(bid).includes(viewer)   // signatory auctioneer, bidder
      ? { kind: "full", amount: bid.amount }
      : { kind: "sealed" };                          // not in the viewer's ledger
  // evm: public chain — a hash until reveal, then the value, forever
}
```

> The redaction bars are a teaching aid. On a live Canton deployment a sealed bid
> never reaches a non-stakeholder's participant node at all — there is no
> placeholder to render. We show one so the contrast is visible at a glance.

## Stack

- **Next.js 16** (App Router) · **Tailwind v4** · **shadcn/ui** (Radix)
- Type: **Fraunces** (display) + **IBM Plex Sans / Mono** (UI + ledger data)
- No backend, no wallet, no Canton node — it's a static, shareable explainer.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build
```
