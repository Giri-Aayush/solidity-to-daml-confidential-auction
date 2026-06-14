"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  AUCTIONEER,
  BIDDERS,
  PARTIES,
  PARTY_META,
  type AuctionResult,
  type Bid,
  type Mode,
  type Party,
  type Visibility,
  commitHash,
  resultVisibleTo,
  settle,
  visibleBid,
} from "@/lib/ledger";

const UNIT = "CC";

export function LedgerDemo() {
  const [mode, setMode] = useState<Mode>("canton");
  const [amounts, setAmounts] = useState<Record<Party, string>>({
    Alice: "30",
    Bob: "50",
    Carol: "40",
    Auctioneer: "",
  });
  const [bids, setBids] = useState<Bid[]>([]);
  const [result, setResult] = useState<AuctionResult | null>(null);

  const hasBid = (p: Party) => bids.some((b) => b.bidder === p);
  const revealed = bids.filter((b) => b.revealed);
  const allRevealed = bids.length > 0 && revealed.length === bids.length;
  const someRevealed = revealed.length > 0;
  const evmUnrevealed = mode === "evm" && bids.length > 0 && !allRevealed;
  // Canton: the auctioneer can settle once there are bids. EVM: only revealed
  // bids count — unrevealed ones are forfeited, mirroring commit/reveal.
  const canSettle = !result && (mode === "canton" ? bids.length > 0 : someRevealed);

  function placeBid(p: Party) {
    if (hasBid(p)) return;
    const amount = Number(amounts[p]);
    if (!Number.isFinite(amount) || amount <= 0) return;
    const secret = Math.random().toString(36).slice(2, 10);
    setBids((b) => [
      ...b,
      { bidder: p, amount, secret, commit: commitHash(amount, secret), revealed: false },
    ]);
  }

  function revealBid(p: Party) {
    setBids((b) => b.map((x) => (x.bidder === p ? { ...x, revealed: true } : x)));
  }

  function doSettle() {
    setResult(settle(mode === "evm" ? revealed : bids));
  }

  function reset() {
    setBids([]);
    setResult(null);
  }

  // Switching ledgers resets the round (clears any decided outcome and re-seals
  // every bid) so an already-settled result can never have its visibility flip
  // mid-demo, and each mode starts cleanly from the bidding phase.
  function changeMode(m: Mode) {
    if (!m || m === mode) return;
    setMode(m);
    setResult(null);
    setBids((b) => b.map((x) => ({ ...x, revealed: false })));
  }

  return (
    <div className="mx-auto w-full max-w-6xl">
      {/* ---- control deck ---------------------------------------------- */}
      <div className="rounded-md border border-line bg-card/60 p-5 backdrop-blur-sm sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="eyebrow mb-2">
              Live ledger · {bids.length}{" "}
              {mode === "canton" ? "sealed" : "committed"} bid
              {bids.length === 1 ? "" : "s"}
            </p>
            <Tabs value={mode} onValueChange={(v) => changeMode(v as Mode)}>
              <TabsList className="bg-secondary/70">
                <TabsTrigger value="canton" className="font-mono text-xs uppercase tracking-wider data-[state=active]:text-vault">
                  Canton · private
                </TabsTrigger>
                <TabsTrigger value="evm" className="font-mono text-xs uppercase tracking-wider data-[state=active]:text-signal">
                  EVM · public
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">
              {mode === "canton" ? (
                <>
                  Each <span className="text-vault">Bid</span> is shared only with the
                  auctioneer and its bidder. Watch a bid appear in full for them — and
                  as a <span className="text-vault">redacted bar</span> for everyone else.
                </>
              ) : (
                <>
                  On a public chain every bid is visible to all. Commit, then{" "}
                  <span className="text-signal">reveal</span> each bid — after reveal the
                  amount is public forever, and any bid left unrevealed is forfeited.
                </>
              )}
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            <div className="flex flex-wrap items-center justify-end gap-2">
              {evmUnrevealed && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-signal/50 font-mono text-xs uppercase tracking-wider text-signal hover:bg-signal/10 hover:text-signal"
                  onClick={() => setBids((b) => b.map((x) => ({ ...x, revealed: true })))}
                >
                  Reveal all ↦
                </Button>
              )}
              <Button
                size="sm"
                disabled={!canSettle}
                className="font-mono text-xs uppercase tracking-wider"
                onClick={doSettle}
              >
                {mode === "canton" ? "Settle (auctioneer)" : "Settle"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="font-mono text-xs uppercase tracking-wider text-muted-foreground"
                onClick={reset}
              >
                Reset
              </Button>
            </div>
            {evmUnrevealed && (
              <p className="font-mono text-[0.65rem] text-signal/80">
                unrevealed bids are forfeited at settlement
              </p>
            )}
          </div>
        </div>

        {/* bidder desks */}
        <hr className="rule my-5" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {BIDDERS.map((p) => {
            const desk = deskAction(p);
            return (
              <div
                key={p}
                className="flex items-center gap-2 rounded-md border border-line bg-bg-sunken/60 px-3 py-2.5"
              >
                <span className="grid size-7 place-items-center rounded-sm bg-secondary font-mono text-[0.65rem] text-vault">
                  {PARTY_META[p].tag}
                </span>
                <span className="w-12 text-sm">{p}</span>
                <Input
                  inputMode="decimal"
                  value={amounts[p]}
                  disabled={hasBid(p)}
                  onChange={(e) =>
                    setAmounts((a) => ({ ...a, [p]: e.target.value }))
                  }
                  className="h-8 w-16 border-line bg-transparent text-right font-mono text-sm tabular"
                  aria-label={`${p} bid amount`}
                />
                <span className="font-mono text-xs text-muted-foreground">{UNIT}</span>
                <Button
                  size="sm"
                  variant={desk.variant}
                  disabled={desk.disabled}
                  className="ml-auto h-8 min-w-[5.5rem] font-mono text-[0.7rem] uppercase tracking-wide"
                  onClick={desk.onClick}
                >
                  {desk.label}
                </Button>
              </div>
            );
          })}
        </div>
      </div>

      {/* ---- the four ledger views ------------------------------------- */}
      <div
        key={mode}
        className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4"
      >
        {PARTIES.map((viewer, i) => (
          <PartyPanel
            key={viewer}
            viewer={viewer}
            bids={bids}
            result={result}
            mode={mode}
            delay={i * 70}
          />
        ))}
      </div>

      <p className="mt-4 text-center text-xs leading-relaxed text-ink-faint">
        Redaction bars are a teaching aid. On a live Canton deployment, a sealed bid
        never reaches a non-stakeholder&apos;s participant node at all — they
        wouldn&apos;t see even a placeholder.
      </p>
    </div>
  );

  // Per-bidder desk button: phase- and mode-aware.
  function deskAction(p: Party): {
    label: string;
    disabled: boolean;
    variant: "secondary" | "ghost" | "outline";
    onClick: () => void;
  } {
    const bid = bids.find((b) => b.bidder === p);
    if (mode === "canton") {
      return bid
        ? { label: "sealed ✓", disabled: true, variant: "ghost", onClick: () => {} }
        : { label: "seal bid", disabled: false, variant: "secondary", onClick: () => placeBid(p) };
    }
    if (!bid) {
      return { label: "commit", disabled: false, variant: "secondary", onClick: () => placeBid(p) };
    }
    if (!bid.revealed) {
      return { label: "reveal ↦", disabled: false, variant: "outline", onClick: () => revealBid(p) };
    }
    return { label: "revealed ✓", disabled: true, variant: "ghost", onClick: () => {} };
  }
}

function PartyPanel({
  viewer,
  bids,
  result,
  mode,
  delay,
}: {
  viewer: Party;
  bids: Bid[];
  result: AuctionResult | null;
  mode: Mode;
  delay: number;
}) {
  const isAuctioneer = viewer === AUCTIONEER;
  // Compute each bid's visibility once, then derive the counter from it.
  const views = bids.map((bid) => ({ bid, v: visibleBid(bid, viewer, mode) }));
  const seen = views.filter((x) => x.v.kind === "full").length;

  return (
    <section
      className="rise flex flex-col rounded-md border bg-card/70 p-4"
      style={{
        animationDelay: `${delay}ms`,
        borderColor: isAuctioneer ? "rgba(230,173,60,0.35)" : "var(--line)",
      }}
    >
      <header className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span
            className={`grid size-8 place-items-center rounded-sm font-mono text-[0.65rem] ${
              isAuctioneer
                ? "bg-vault/15 text-vault seal-dot"
                : "bg-secondary text-bone"
            }`}
          >
            {PARTY_META[viewer].tag}
          </span>
          <div className="leading-tight">
            <p className="font-display text-base">{viewer}</p>
            <p className="kicker">{PARTY_META[viewer].role}</p>
          </div>
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-help font-mono text-[0.7rem] text-muted-foreground tabular">
              sees {seen}/{bids.length}
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-[220px] text-xs">
            A party&apos;s node holds only contracts where it is a signatory or
            observer. The auctioneer signs every bid; a bidder signs only their own.
          </TooltipContent>
        </Tooltip>
      </header>

      <hr className="rule my-3" />

      <ul className="flex flex-col gap-2">
        {bids.length === 0 && (
          <li className="py-6 text-center font-mono text-xs text-ink-faint">
            — no bids yet —
          </li>
        )}
        {views.map(({ bid, v }) => (
          <BidRow key={bid.bidder} bid={bid} v={v} viewer={viewer} />
        ))}
      </ul>

      {result && (
        <>
          <hr className="rule my-3" />
          <ResultRow result={result} viewer={viewer} mode={mode} />
        </>
      )}
    </section>
  );
}

function BidRow({ bid, v, viewer }: { bid: Bid; v: Visibility; viewer: Party }) {
  const own = bid.bidder === viewer;

  if (v.kind === "sealed") {
    return (
      <li className="seal-in flex items-center justify-between gap-2 rounded-sm bg-bg-sunken/50 px-2.5 py-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="redaction font-mono text-xs">sealed</span>
          </TooltipTrigger>
          <TooltipContent className="max-w-[220px] text-xs">
            Not shared with {viewer}. On Canton this contract never reaches their
            node — shown redacted here only for contrast.
          </TooltipContent>
        </Tooltip>
        <span className="font-mono text-[0.7rem] text-ink-faint">not yours</span>
      </li>
    );
  }

  return (
    <li className="seal-in flex items-center justify-between gap-2 rounded-sm bg-bg-sunken/50 px-2.5 py-2">
      <span className="flex items-center gap-2 font-mono text-xs">
        <span className={own ? "text-vault" : "text-bone"}>
          {bid.bidder}
          {own && <span className="text-ink-faint"> (you)</span>}
        </span>
      </span>
      {v.kind === "full" ? (
        <span className="font-mono text-sm tabular text-bone">
          {v.amount} <span className="text-ink-faint">{UNIT}</span>
        </span>
      ) : (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="cursor-help font-mono text-[0.7rem] text-signal">
              {v.hash.slice(0, 12)}…
            </span>
          </TooltipTrigger>
          <TooltipContent className="max-w-[240px] text-xs">
            An illustrative commitment (stand-in for keccak256). Public but opaque —
            until this bidder reveals, then the amount is public to everyone, forever.
          </TooltipContent>
        </Tooltip>
      )}
    </li>
  );
}

function ResultRow({
  result,
  viewer,
  mode,
}: {
  result: AuctionResult;
  viewer: Party;
  mode: Mode;
}) {
  const canSee = resultVisibleTo(result, viewer, mode);
  const youWon = viewer === result.winner;

  if (!canSee) {
    return (
      <div className="flex items-center justify-between gap-2">
        <span className="kicker">outcome</span>
        <span className="redaction font-mono text-xs">sealed</span>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-between gap-2">
      <span className="kicker">winner</span>
      <Badge
        variant="outline"
        className="border-vault/40 bg-vault/10 font-mono text-xs text-vault"
      >
        {result.winner} · {result.amount} {UNIT}
        {youWon && <span className="text-bone"> ★</span>}
      </Badge>
    </div>
  );
}
