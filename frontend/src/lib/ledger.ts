// A tiny in-memory ledger that mirrors the Daml templates in ../../../daml.
//
// The point of this file is fidelity: visibility here is decided the *same way*
// Daml decides it, by who the stakeholders of a contract are, not by any
// ad-hoc UI flag. `visibleBid` is the whole privacy model in one function.

export type Party = "Alice" | "Bob" | "Carol" | "Auctioneer";

export const AUCTIONEER: Party = "Auctioneer";
export const BIDDERS: Party[] = ["Alice", "Bob", "Carol"];
export const PARTIES: Party[] = ["Alice", "Bob", "Carol", "Auctioneer"];

export type Mode = "canton" | "evm";

export const PARTY_META: Record<Party, { role: string; tag: string }> = {
  Alice: { role: "Bidder", tag: "A" },
  Bob: { role: "Bidder", tag: "B" },
  Carol: { role: "Bidder", tag: "C" },
  Auctioneer: { role: "Auctioneer", tag: "AU" },
};

// template Bid with auctioneer, bidder, amount  →  signatory auctioneer, bidder
export interface Bid {
  bidder: Party;
  amount: number;
  secret: string;
  commit: string; // illustrative commitment, computed once at creation
  revealed: boolean; // EVM only: a committed bid becomes public at reveal
  revealSeq?: number; // EVM only: order this bid was revealed; ties go to the first revealer, as the contract resolves them
}

// template AuctionResult  →  signatory auctioneer; observer winner
export interface AuctionResult {
  winner: Party;
  amount: number;
}

/** Daml: `signatory auctioneer, bidder`. Nobody else is a stakeholder. */
export function bidStakeholders(bid: Bid): Party[] {
  return [AUCTIONEER, bid.bidder];
}

export type Visibility =
  | { kind: "full"; amount: number } // the viewer sees the real amount
  | { kind: "hash"; hash: string } // EVM commit phase: only a keccak commitment
  | { kind: "sealed" }; // Canton: the contract is not in the viewer's ledger

/**
 * What `viewer` can see of `bid`.
 *  - Canton: a Bid is shared only with its stakeholders (auctioneer + bidder).
 *  - EVM: every bid is on a public chain, a hash until reveal, then the value,
 *    forever, to everyone.
 */
export function visibleBid(bid: Bid, viewer: Party, mode: Mode): Visibility {
  if (mode === "canton") {
    return bidStakeholders(bid).includes(viewer)
      ? { kind: "full", amount: bid.amount }
      : { kind: "sealed" };
  }
  return bid.revealed
    ? { kind: "full", amount: bid.amount }
    : { kind: "hash", hash: bid.commit };
}

/** AuctionResult is observed by the winner only (plus the auctioneer signatory). */
export function resultVisibleTo(
  result: AuctionResult,
  viewer: Party,
  mode: Mode,
): boolean {
  if (mode === "evm") return true; // public chain: everyone sees the outcome
  return viewer === AUCTIONEER || viewer === result.winner;
}

/**
 * Highest bid wins (first-price). Mirrors the Auction `Settle` choice. The sort is
 * stable, so equal top bids keep their input order: callers pass EVM bids in reveal
 * order (and Canton bids in submission order), so a tie goes to the first revealer,
 * exactly as the Solidity contract's strict `value > highestBid` check resolves it.
 */
export function settle(bids: Bid[]): AuctionResult | null {
  if (bids.length === 0) return null;
  const top = [...bids].sort((a, b) => b.amount - a.amount)[0];
  return { winner: top.bidder, amount: top.amount };
}

/** How many of `bids` the viewer can actually read the value of. */
export function visibleCount(bids: Bid[], viewer: Party, mode: Mode): number {
  return bids.filter((b) => visibleBid(b, viewer, mode).kind === "full").length;
}

/**
 * Illustrative commitment shown in EVM commit phase: two FNV-1a words → 16 hex.
 * This is deliberately NOT cryptographic: it only needs to look like an opaque,
 * public commitment so the demo can show "everyone sees a hash, no one sees the
 * value yet." The real Solidity contract uses
 * keccak256(abi.encodePacked(value, secret)). Computed once at bid creation.
 */
export function commitHash(amount: number, secret: string): string {
  const word = (seed: number) => {
    let h = seed >>> 0;
    const s = `${amount}:${secret}`;
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 0x01000193);
    }
    return (h >>> 0).toString(16).padStart(8, "0");
  };
  return `0x${word(0x811c9dc5)}${word(0xcbf29ce4)}`;
}
