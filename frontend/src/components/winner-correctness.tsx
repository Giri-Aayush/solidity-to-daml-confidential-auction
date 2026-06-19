const POINTS: { tag: string; accent: string; title: string; body: string }[] = [
  {
    tag: "✓ enforced",
    accent: "text-vault",
    title: "It can't drop a higher bid",
    body: "Every sealed bid bumps a registry-signed counter the moment it is placed. To settle, the auctioneer must hand back exactly that many bids, so the set is provably all of them, never a chosen few.",
  },
  {
    tag: "↩ reclaimable",
    accent: "text-vault",
    title: "Worst case is a stall, not a stolen win",
    body: "A misbehaving auctioneer can refuse to settle, but it can never crown a loser. Once the deadline passes, every bidder reclaims their own locked funds without it.",
  },
  {
    tag: "the tradeoff",
    accent: "text-signal",
    title: "Trust sits on the neutral registry",
    body: "The count is vouched for by the token issuer, not the auctioneer, because a fully private ledger cannot prove completeness on its own. The EVM side turns the same dial the other way: it reveals every bid so anyone can check.",
  },
];

export function WinnerCorrectness() {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-24">
      <p className="eyebrow mb-4">But can the auctioneer cheat?</p>
      <h2 className="max-w-2xl font-display text-3xl leading-tight sm:text-4xl">
        If only the auctioneer sees the bids,{" "}
        <span className="text-muted-foreground">
          what stops it crowning the wrong winner?
        </span>
      </h2>
      <p className="mt-4 max-w-2xl text-muted-foreground">
        Privacy puts every bid in the auctioneer&apos;s hands, which raises the obvious
        objection. The answer is on the ledger: settlement has to prove it counted every
        bid, so the winner is the true high bid, not just a trusted one.
      </p>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {POINTS.map((p) => (
          <div key={p.title} className="rounded-md border border-line bg-card/50 p-5">
            <p
              className={`font-mono text-[0.7rem] uppercase tracking-wider ${p.accent}`}
            >
              {p.tag}
            </p>
            <h3 className="mt-2 font-display text-xl">{p.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {p.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
