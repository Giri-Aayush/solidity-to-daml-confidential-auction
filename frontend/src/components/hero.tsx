import { Button } from "@/components/ui/button";
import { Eye, EyeOff, Gavel } from "lucide-react";

const REPO = "https://github.com/Giri-Aayush/solidity-to-daml-confidential-auction";
const GUIDE = `${REPO}/blob/main/guide/solidity-to-daml.md`;

const STATS = [
  ["1 auction", "two implementations"],
  ["~90 ↦ ~70", "solidity loc ↦ daml loc"],
  ["12 + 4", "foundry + daml tests, green"],
  ["0", "lines of privacy plumbing in daml"],
];

const GRADIENT =
  "linear-gradient(155deg, #2b1b6b 0%, #5b3fc9 35%, #8b5cf6 70%, #a78bfa 100%)";

export function Hero() {
  return (
    <header className="relative overflow-hidden">
      {/* ledger-line backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          backgroundImage: "linear-gradient(var(--line) 1px, transparent 1px)",
          backgroundSize: "100% 2.4rem",
          maskImage: "radial-gradient(120% 70% at 50% 0%, black, transparent 75%)",
          WebkitMaskImage: "radial-gradient(120% 70% at 50% 0%, black, transparent 75%)",
        }}
      />

      <nav className="relative mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-6">
        <a href={REPO} className="flex items-center gap-2 font-mono text-xs tracking-wide text-bone">
          <span className="text-vault">◆</span> confidential-auction
        </a>
        <div className="flex items-center gap-1">
          <a href={GUIDE}>
            <Button variant="ghost" size="sm" className="font-mono text-xs lowercase tracking-wider text-muted-foreground">
              guide
            </Button>
          </a>
          <a href={REPO} target="_blank" rel="noreferrer">
            <Button variant="ghost" size="sm" className="font-mono text-xs lowercase tracking-wider text-muted-foreground">
              github ↗
            </Button>
          </a>
        </div>
      </nav>

      <div className="relative mx-auto w-full max-w-6xl px-5 pb-16 pt-8 sm:pt-12">
        <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.2fr_0.85fr]">
          {/* left: copy */}
          <div>
            <p className="eyebrow mb-5 rise" style={{ animationDelay: "40ms" }}>
              solidity → daml · a confidential auction on canton
            </p>
            <h1
              className="rise max-w-3xl font-display text-5xl font-semibold leading-[0.98] tracking-tight sm:text-6xl"
              style={{ animationDelay: "120ms" }}
            >
              the bid no one else can <span className="italic text-vault">see.</span>
            </h1>
            <p
              className="rise mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground"
              style={{ animationDelay: "220ms" }}
            >
              The same sealed-bid auction, built twice. On the EVM you fake privacy with
              commit, reveal, deposits, and forfeiture. On Canton, a bid is simply shared
              with no one else, so all of that machinery{" "}
              <span className="text-bone">disappears</span>.
            </p>
            <div className="rise mt-8 flex flex-wrap items-center gap-3" style={{ animationDelay: "320ms" }}>
              <a href="#demo">
                <Button size="lg" className="font-mono text-xs lowercase tracking-wider">
                  try the ledger ↓
                </Button>
              </a>
              <a href={GUIDE} target="_blank" rel="noreferrer">
                <Button size="lg" variant="outline" className="border-line font-mono text-xs lowercase tracking-wider">
                  read the translation guide
                </Button>
              </a>
            </div>
          </div>

          {/* right: the single gradient hero card */}
          <div
            className="rise relative flex min-h-[300px] flex-col gap-4 overflow-hidden rounded-[14px] p-6 text-white"
            style={{ background: GRADIENT, boxShadow: "0 8px 32px rgba(91,63,201,0.35)", animationDelay: "300ms" }}
            aria-hidden
          >
            <div
              className="pointer-events-none absolute inset-0"
              style={{ background: "radial-gradient(circle at 82% 8%, rgba(255,255,255,0.22), transparent 52%)" }}
            />
            <div className="relative flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm font-medium">
                <Gavel size={16} /> sealed bid
              </span>
              <span className="rounded-[10px] bg-white/20 px-2 py-0.5 text-[10px]">canton · private</span>
            </div>
            <div className="relative mt-1 flex flex-col gap-2">
              {[
                { who: "auctioneer sees", val: "bob · 50 CC", eye: true },
                { who: "bob sees", val: "bob · 50 CC", eye: true },
                { who: "alice sees", val: null, eye: false },
              ].map((r) => (
                <div
                  key={r.who}
                  className="flex items-center justify-between gap-2 rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-xs"
                >
                  <span className="flex items-center gap-2">
                    {r.eye ? <Eye size={14} /> : <EyeOff size={14} />} {r.who}
                  </span>
                  {r.val ? (
                    <span className="font-mono">{r.val}</span>
                  ) : (
                    <span
                      className="rounded px-2 py-0.5 font-mono tracking-tighter text-white/45"
                      style={{
                        background:
                          "repeating-linear-gradient(135deg, rgba(0,0,0,0.28) 0 5px, rgba(0,0,0,0.12) 5px 10px)",
                      }}
                    >
                      █████ ██
                    </span>
                  )}
                </div>
              ))}
            </div>
            <p className="relative mt-auto text-[11px] opacity-80">
              one bid, three ledgers. only stakeholders can read it.
            </p>
          </div>
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

        <p className="rise mt-5 font-mono text-xs text-ink-faint" style={{ animationDelay: "480ms" }}>
          built on the latest stack: daml 3.4 on canton · solidity 0.8.35
        </p>
      </div>
    </header>
  );
}
