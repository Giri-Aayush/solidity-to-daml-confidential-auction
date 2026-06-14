import { Button } from "@/components/ui/button";

const REPO = "https://github.com/Giri-Aayush/solidity-to-daml-confidential-auction";
const GUIDE = `${REPO}/blob/main/guide/solidity-to-daml.md`;

const STATS = [
  ["1 auction", "two implementations"],
  ["~150 ↦ ~90", "solidity loc ↦ daml loc"],
  ["8 + 3", "foundry + daml tests, green"],
  ["0", "lines of privacy plumbing in daml"],
];

export function Hero() {
  return (
    <header className="relative overflow-hidden">
      {/* ledger-line backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.5]"
        style={{
          backgroundImage:
            "linear-gradient(var(--line) 1px, transparent 1px)",
          backgroundSize: "100% 2.4rem",
          maskImage:
            "radial-gradient(120% 70% at 50% 0%, black, transparent 75%)",
          WebkitMaskImage:
            "radial-gradient(120% 70% at 50% 0%, black, transparent 75%)",
        }}
      />

      <nav className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6">
        <a href={REPO} className="flex items-center gap-2 font-mono text-xs tracking-wide text-bone">
          <span className="text-vault">◆</span> confidential-auction
        </a>
        <div className="flex items-center gap-1">
          <a href={GUIDE}>
            <Button variant="ghost" size="sm" className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              Guide
            </Button>
          </a>
          <a href={REPO} target="_blank" rel="noreferrer">
            <Button variant="ghost" size="sm" className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
              GitHub ↗
            </Button>
          </a>
        </div>
      </nav>

      <div className="relative mx-auto w-full max-w-6xl px-5 pb-16 pt-10 sm:pt-16">
        <p className="eyebrow mb-6 rise" style={{ animationDelay: "40ms" }}>
          Solidity → Daml · a confidential auction on Canton
        </p>

        <h1
          className="rise max-w-4xl font-display text-5xl font-[900] leading-[0.95] tracking-tight sm:text-7xl"
          style={{ animationDelay: "120ms" }}
        >
          The bid
          <br />
          no one else can{" "}
          <span className="italic text-vault">see.</span>
        </h1>

        <p
          className="rise mt-7 max-w-xl text-lg leading-relaxed text-muted-foreground"
          style={{ animationDelay: "220ms" }}
        >
          The same sealed-bid auction, built twice. On the EVM you fake privacy with
          commit, reveal, deposits, and forfeiture. On Canton, a bid is simply shared
          with no one else — so all of that machinery{" "}
          <span className="text-bone">disappears</span>.
        </p>

        <div
          className="rise mt-9 flex flex-wrap items-center gap-3"
          style={{ animationDelay: "320ms" }}
        >
          <a href="#demo">
            <Button size="lg" className="font-mono text-xs uppercase tracking-wider">
              Try the ledger ↓
            </Button>
          </a>
          <a href={GUIDE} target="_blank" rel="noreferrer">
            <Button
              size="lg"
              variant="outline"
              className="border-line font-mono text-xs uppercase tracking-wider"
            >
              Read the translation guide
            </Button>
          </a>
        </div>

        {/* stat strip */}
        <div
          className="rise mt-14 grid grid-cols-2 gap-px overflow-hidden rounded-md border border-line bg-line lg:grid-cols-4"
          style={{ animationDelay: "420ms" }}
        >
          {STATS.map(([big, small]) => (
            <div key={small} className="bg-card/70 px-5 py-4">
              <p className="font-display text-2xl text-vault tabular">{big}</p>
              <p className="kicker mt-1">{small}</p>
            </div>
          ))}
        </div>
      </div>
    </header>
  );
}
