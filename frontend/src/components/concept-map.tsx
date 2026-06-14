const ROWS: [string, string, string][] = [
  ["mapping(address => Bid)", "one Bid contract per bidder", "no shared map to read"],
  ["msg.sender", "choice controller", "authenticated by the ledger"],
  ["require(msg.sender == owner)", "controller / signatory", "authz is part of the type"],
  ["mutate storage", "archive + re-create", "contracts are immutable"],
  ["keccak256 commit + reveal", "— nothing —", "privacy is native"],
  ["deposits & forfeiture", "— nothing —", "a bid is already binding"],
  ["pendingReturns / withdraw", "— nothing —", "no escrow, no reentrancy"],
  ["event / emit", "stakeholders see the tx", "no separate event log"],
];

const VANISHED = [
  {
    title: "The reveal phase",
    body: "No hash to commit to, so no second window to reveal it. A bid is born private.",
  },
  {
    title: "Deposits & forfeiture",
    body: "These existed only to make a hidden commitment binding. A Daml bid is a real, authorized contract the instant it is created.",
  },
  {
    title: "The reentrancy surface",
    body: "No value escrowed mid-contract, no external calls during execution — the pull-payment dance simply isn't needed.",
  },
];

export function ConceptMap() {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-24">
      <p className="eyebrow mb-4">The translation</p>
      <h2 className="max-w-2xl font-display text-3xl leading-tight sm:text-4xl">
        Everything you&apos;d reach for in Solidity —{" "}
        <span className="text-muted-foreground">and what it becomes.</span>
      </h2>

      <div className="mt-10 overflow-hidden rounded-md border border-line">
        <div className="grid grid-cols-[1.1fr_1fr_1fr] bg-secondary/50 px-4 py-2.5 font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
          <span>Solidity / EVM</span>
          <span>Daml / Canton</span>
          <span className="hidden sm:block">why it shrinks</span>
        </div>
        {ROWS.map(([sol, daml, why], i) => {
          const gone = daml.includes("nothing");
          return (
            <div
              key={sol}
              className="grid grid-cols-[1.1fr_1fr_1fr] items-center gap-2 px-4 py-3 font-mono text-xs sm:text-sm"
              style={{
                borderTop: i === 0 ? "none" : "1px solid var(--line)",
                background: i % 2 ? "transparent" : "rgba(255,255,255,0.012)",
              }}
            >
              <span className="text-signal/90">{sol}</span>
              <span className={gone ? "text-vault" : "text-bone"}>
                {gone ? <span className="line-through decoration-vault/50">{daml}</span> : daml}
              </span>
              <span className="hidden text-ink-faint sm:block">{why}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {VANISHED.map((v) => (
          <div key={v.title} className="rounded-md border border-line bg-card/50 p-5">
            <p className="font-mono text-[0.7rem] uppercase tracking-wider text-vault">
              ✕ deleted
            </p>
            <h3 className="mt-2 font-display text-xl">{v.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {v.body}
            </p>
          </div>
        ))}
      </div>
    </section>
  );
}
