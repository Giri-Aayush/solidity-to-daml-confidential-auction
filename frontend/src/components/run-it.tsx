import { Terminal, ArrowUpRight } from "lucide-react";

const REPO = "https://github.com/Giri-Aayush/solidity-to-daml-confidential-auction";
const GUIDE = `${REPO}/blob/main/guide/solidity-to-daml.md`;

const LINES: { cmd: string; note?: string }[] = [
  { cmd: "git clone github.com/Giri-Aayush/solidity-to-daml-confidential-auction" },
  { cmd: "cd solidity-to-daml-confidential-auction" },
  { cmd: "make test", note: "16 solidity + 8 daml tests, green" },
  { cmd: "make canton", note: "the auction on a real canton node" },
  { cmd: "make web", note: "this site, locally" },
];

const STEPS = [
  {
    k: "make test",
    d: "Runs both suites, the same thing CI runs on every push. The token-standard packages are vendored, so it builds offline.",
  },
  {
    k: "make canton",
    d: "Boots a real Canton node in-process (no Docker), deploys the auction, and runs the privacy + DvP proof on the live ledger, then cleans up.",
  },
  {
    k: "make web",
    d: "Serves this explainer locally, so you can read the code and poke the demo side by side.",
  },
];

export function RunIt() {
  return (
    <section id="run" className="border-y border-line bg-bg-sunken/40 py-20">
      <div className="mx-auto w-full max-w-6xl px-5">
        <p className="eyebrow mb-4">run it yourself</p>
        <h2 className="max-w-2xl font-display text-3xl leading-tight sm:text-4xl">
          From reading about it to{" "}
          <span className="text-vault">running it</span>, in one command.
        </h2>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          Everything on this page is reproducible from the repo. No Docker: a real
          Canton node boots in-process, the token-standard packages are vendored, and
          the scripts find your toolchain for you.
        </p>

        <div className="mt-9 grid grid-cols-1 gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          {/* terminal */}
          <div className="self-start overflow-hidden rounded-md border border-line bg-[#0b0b11]">
            <div className="flex items-center gap-2 border-b border-line px-4 py-2.5">
              <span className="dots">
                <i style={{ background: "#ff5f56" }} />
                <i style={{ background: "#ffbd2e" }} />
                <i style={{ background: "#27c93f" }} />
              </span>
              <span className="ml-1 flex items-center gap-1.5 font-mono text-[0.7rem] text-muted-foreground">
                <Terminal className="size-3" /> bash
              </span>
            </div>
            <pre className="overflow-x-auto px-5 py-4 font-mono text-[0.78rem] leading-[1.95]">
              {LINES.map((l) => (
                <div key={l.cmd}>
                  <span className="text-vault">$ </span>
                  <span className="text-bone">{l.cmd}</span>
                  {l.note && <span className="text-ink-faint">{"  # " + l.note}</span>}
                </div>
              ))}
            </pre>
          </div>

          {/* what each command does */}
          <div className="flex flex-col gap-3">
            {STEPS.map((s) => (
              <div key={s.k} className="rounded-md border border-line bg-card/50 p-4">
                <p className="font-mono text-sm text-vault">{s.k}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                  {s.d}
                </p>
              </div>
            ))}
            <div className="mt-1 flex flex-wrap gap-5 font-mono text-xs">
              <a
                href={REPO}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-vault hover:underline"
              >
                view the repo <ArrowUpRight className="size-3.5" />
              </a>
              <a
                href={GUIDE}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-muted-foreground hover:text-bone"
              >
                read the guide <ArrowUpRight className="size-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
