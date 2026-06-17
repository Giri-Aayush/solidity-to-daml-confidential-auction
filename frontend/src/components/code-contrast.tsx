import type { ReactNode } from "react";
import { FileCode } from "lucide-react";

const SOL_GUTTER = Array.from({ length: 18 }, (_, i) => i + 1).join("\n");
const DAML_GUTTER = Array.from({ length: 16 }, (_, i) => i + 1).join("\n");

const SOL_CODE = `<span class="t-c">// commit phase: hide the bid behind a hash + a deposit</span>
<span class="t-k">function</span> <span class="t-f">commit</span>(<span class="t-t">bytes32</span> blindedBid) <span class="t-k">external</span> <span class="t-k">payable</span> onlyBefore(biddingEnd) {
    <span class="t-ctl">if</span> (blindedBid == <span class="t-t">bytes32</span>(<span class="t-n">0</span>)) <span class="t-ctl">revert</span> <span class="t-t">EmptyCommitment</span>();
    <span class="t-ctl">if</span> (bids[msg.sender].blindedBid != <span class="t-t">bytes32</span>(<span class="t-n">0</span>)) <span class="t-ctl">revert</span> <span class="t-t">AlreadyCommitted</span>();
    bids[msg.sender] = <span class="t-t">Bid</span>({blindedBid: blindedBid, deposit: msg.value, revealed: <span class="t-k">false</span>});
}

<span class="t-c">// reveal phase: open it later, and now it is public forever</span>
<span class="t-k">function</span> <span class="t-f">reveal</span>(<span class="t-t">uint256</span> value, <span class="t-t">bytes32</span> secret) <span class="t-k">external</span> onlyAfter(biddingEnd) onlyBefore(revealEnd) {
    <span class="t-t">Bid</span> <span class="t-k">storage</span> bid = bids[msg.sender];
    <span class="t-ctl">if</span> (bid.blindedBid == <span class="t-t">bytes32</span>(<span class="t-n">0</span>)) <span class="t-ctl">revert</span> <span class="t-t">NothingCommitted</span>();
    <span class="t-t">bool</span> valid = bid.blindedBid == <span class="t-f">_commitmentOf</span>(value, secret)
        <span class="t-p">&amp;&amp;</span> bid.deposit <span class="t-p">&gt;=</span> value <span class="t-p">&amp;&amp;</span> value <span class="t-p">&gt;</span> <span class="t-n">0</span>;
    <span class="t-ctl">if</span> (valid <span class="t-p">&amp;&amp;</span> value <span class="t-p">&gt;</span> highestBid) {
        highestBid = value; highestBidder = msg.sender;
    }
    <span class="t-c">// ... refunds, pendingReturns, withdraw, forfeiture</span>
}`;

const DAML_CODE = `<span class="t-c">-- a single sealed bid, co-signed by the auctioneer and the</span>
<span class="t-c">-- bidder and nobody else. it carries the bidder's locked</span>
<span class="t-c">-- funds as a token-standard Allocation.</span>
<span class="t-k">template</span> <span class="t-t">Bid</span>
  <span class="t-k">with</span>
    auctioneer <span class="t-p">:</span> <span class="t-t">Party</span>
    auctionId <span class="t-p">:</span> <span class="t-t">Text</span>
    item <span class="t-p">:</span> <span class="t-t">Text</span>
    bidder <span class="t-p">:</span> <span class="t-t">Party</span>
    beneficiary <span class="t-p">:</span> <span class="t-t">Party</span>
    amount <span class="t-p">:</span> <span class="t-t">Decimal</span>
    allocation <span class="t-p">:</span> <span class="t-t">ContractId</span> <span class="t-t">Allocation</span>
  <span class="t-k">where</span>
    <span class="t-k">signatory</span> auctioneer, bidder
    <span class="t-k">ensure</span> amount <span class="t-p">&gt;</span> <span class="t-n">0.0</span>
    <span class="t-c">-- the signatory set is the entire privacy model</span>`;

// The snippets above use a small, fixed vocabulary of <span class="t-*"> tokens
// for highlighting. Parse them into real elements instead of injecting raw HTML,
// so there is no dangerouslySetInnerHTML even though the input is static.
const ENTITIES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">" };
const decode = (s: string) => s.replace(/&amp;|&lt;|&gt;/g, (m) => ENTITIES[m]);

function highlight(src: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /<span class="(t-[a-z]+)">([\s\S]*?)<\/span>/g;
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(src)) !== null) {
    if (m.index > last) out.push(decode(src.slice(last, m.index)));
    out.push(
      <span key={key++} className={m[1]}>
        {decode(m[2])}
      </span>,
    );
    last = m.index + m[0].length;
  }
  if (last < src.length) out.push(decode(src.slice(last)));
  return out;
}

function Dots() {
  return (
    <span className="dots">
      <i style={{ background: "#ff5f56" }} />
      <i style={{ background: "#ffbd2e" }} />
      <i style={{ background: "#27c93f" }} />
    </span>
  );
}

export function CodeContrast() {
  return (
    <section className="mx-auto w-full max-w-6xl px-5 py-24">
      <div className="section-head">
        <p className="eyebrow mb-4">the same privacy, in code</p>
        <h2 className="max-w-2xl font-display text-3xl leading-tight sm:text-4xl">
          on the evm, privacy is machinery.{" "}
          <span className="text-muted-foreground">on canton, it&apos;s the type.</span>
        </h2>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          The Solidity contract spends commit, reveal, deposits, and a timeline to fake
          a secret. The Daml template just names who is allowed to see the bid, and the
          rest disappears.
        </p>
      </div>

      <div className="mt-9 grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="vsc evm">
          <div className="vsc-bar">
            <Dots />
            <span className="vsc-path">solidity / src / SealedBidAuction.sol</span>
            <span />
          </div>
          <div className="vsc-tabs">
            <span className="vsc-tab active">
              <FileCode aria-hidden /> SealedBidAuction.sol <span className="x">×</span>
            </span>
          </div>
          <div className="vsc-body">
            <pre className="gutter" aria-hidden="true">{SOL_GUTTER}</pre>
            <pre className="code">
              <code>{highlight(SOL_CODE)}</code>
            </pre>
          </div>
          <div className="vsc-status">
            <span>Solidity 0.8.35</span>
            <span className="right">UTF-8 · LF · Ln 1, Col 1</span>
          </div>
        </div>

        <div className="vsc canton">
          <div className="vsc-bar">
            <Dots />
            <span className="vsc-path">daml / ConfidentialAuction.daml</span>
            <span />
          </div>
          <div className="vsc-tabs">
            <span className="vsc-tab active">
              <FileCode aria-hidden /> ConfidentialAuction.daml <span className="x">×</span>
            </span>
          </div>
          <div className="vsc-body">
            <pre className="gutter" aria-hidden="true">{DAML_GUTTER}</pre>
            <pre className="code">
              <code>{highlight(DAML_CODE)}</code>
            </pre>
          </div>
          <div className="vsc-status">
            <span>Daml 3.4</span>
            <span className="right">UTF-8 · LF · Ln 1, Col 1</span>
          </div>
        </div>
      </div>
    </section>
  );
}
