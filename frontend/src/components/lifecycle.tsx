import { Clock, TriangleAlert, Zap } from "lucide-react";

type Kind = "setup" | "timed" | "warn" | "tx" | "atomic";
type Step = { t: string; s: string; tag: string; kind: Kind };

const EVM: Step[] = [
  { t: "deploy the contract", s: "the commit and reveal deadlines are fixed up front", tag: "setup", kind: "setup" },
  { t: "commit window", s: "each bidder sends a transaction carrying a hashed bid and a deposit", tag: "timed", kind: "timed" },
  { t: "reveal window", s: "each bidder sends a reveal transaction; miss it and the deposit is forfeited", tag: "forfeit risk", kind: "warn" },
  { t: "auctionEnd()", s: "a transaction tallies the revealed bids and picks the winner", tag: "tx", kind: "tx" },
  { t: "withdraw()", s: "every loser pulls their own refund in a separate transaction", tag: "tx", kind: "tx" },
];

const CANTON: Step[] = [
  { t: "create the auction", s: "the auctioneer invites bidders; a single settle deadline", tag: "setup", kind: "setup" },
  { t: "place bid", s: "seals the bid and locks the funds as a token-standard holding, in one transaction", tag: "1 tx", kind: "tx" },
  { t: "settle", s: "atomic delivery-versus-payment once the auctioneer settles: the winner pays the seller and losers are refunded, recorded together", tag: "atomic", kind: "atomic" },
];

function Tag({ kind, label }: { kind: Kind; label: string }) {
  const styles: Record<Kind, string> = {
    setup: "border-line text-ink-faint",
    timed: "border-signal/40 text-signal",
    warn: "border-signal/50 text-signal",
    tx: "border-line text-muted-foreground",
    atomic: "border-vault/45 text-vault",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[0.6rem] uppercase tracking-wider ${styles[kind]}`}>
      {kind === "timed" && <Clock className="size-2.5" />}
      {kind === "warn" && <TriangleAlert className="size-2.5" />}
      {kind === "atomic" && <Zap className="size-2.5" />}
      {label}
    </span>
  );
}

function Track({
  title,
  sub,
  accent,
  steps,
  summary,
}: {
  title: string;
  sub: string;
  accent: "signal" | "vault";
  steps: Step[];
  summary: string[];
}) {
  const dot = accent === "signal" ? "bg-signal" : "bg-vault";
  const ring = accent === "signal" ? "text-signal" : "text-vault";
  return (
    <div className="rounded-md border border-line bg-card/50 p-5 sm:p-6">
      <div className="mb-5 flex items-baseline justify-between">
        <h3 className="font-display text-xl">{title}</h3>
        <span className={`font-mono text-[0.65rem] uppercase tracking-wider ${ring}`}>{sub}</span>
      </div>

      <ol>
        {steps.map((step, i) => (
          <li
            key={step.t}
            className="relative border-l border-line pb-5 pl-6 last:border-l-transparent last:pb-0"
          >
            <span className={`absolute -left-[5px] top-1 size-2.5 rounded-full ${dot}`} />
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm text-bone">{step.t}</span>
              <Tag kind={step.kind} label={step.tag} />
            </div>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{step.s}</p>
          </li>
        ))}
      </ol>

      <div className="mt-5 border-t border-line pt-4">
        {summary.map((line) => (
          <p key={line} className={`font-mono text-xs ${ring}`}>{line}</p>
        ))}
      </div>
    </div>
  );
}

export function Lifecycle() {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-24">
      <p className="eyebrow mb-4">the lifecycle</p>
      <h2 className="max-w-2xl font-display text-3xl leading-tight sm:text-4xl">
        Two timed windows and a forfeiture rule.{" "}
        <span className="text-muted-foreground">Or two transactions.</span>
      </h2>
      <p className="mt-4 max-w-2xl text-muted-foreground">
        Privacy is the headline, but the cost shows up in the lifecycle. The EVM auction
        runs across two timed phases and a string of transactions, and punishes anyone who
        forgets to reveal. On Canton the same auction is a bid and an atomic settlement.
      </p>

      <div className="mt-9 grid grid-cols-1 gap-4 md:grid-cols-2">
        <Track
          title="Solidity / EVM"
          sub="public"
          accent="signal"
          steps={EVM}
          summary={["two timed windows, up to 2N + 2 transactions", "deposit forfeited if a bidder never reveals"]}
        />
        <Track
          title="Daml / Canton"
          sub="private"
          accent="vault"
          steps={CANTON}
          summary={["two steps, one atomic settlement", "no reveal window, no forfeiture, no pull-payment"]}
        />
      </div>
    </section>
  );
}
