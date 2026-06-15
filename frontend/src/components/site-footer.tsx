const REPO = "https://github.com/Giri-Aayush/solidity-to-daml-confidential-auction";

const LINKS = [
  ["Translation guide", `${REPO}/blob/main/guide/solidity-to-daml.md`],
  ["Solidity contract", `${REPO}/tree/main/solidity`],
  ["Daml templates", `${REPO}/tree/main/daml`],
  ["Repository", REPO],
];

export function SiteFooter() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto w-full max-w-6xl px-5 py-12">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-sm">
            <p className="flex items-center gap-2 font-mono text-sm text-bone">
              <span className="text-vault">◆</span> confidential-auction
            </p>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              A worked translation of a familiar EVM pattern into Canton&apos;s
              Daml-based, privacy-preserving model. The simulated ledger above
              mirrors the real Daml templates in the repo.
            </p>
          </div>

          <nav className="grid grid-cols-2 gap-x-10 gap-y-2">
            {LINKS.map(([label, href]) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                className="font-mono text-xs text-muted-foreground transition-colors hover:text-vault"
              >
                {label} ↗
              </a>
            ))}
          </nav>
        </div>

        <hr className="rule my-8" />
        <p className="font-mono text-[0.7rem] text-ink-faint">
          Built on Daml 3.4 (Canton) · Solidity 0.8.35 · Foundry · Next.js. MIT licensed.
        </p>
      </div>
    </footer>
  );
}
