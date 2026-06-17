import { Hero } from "@/components/hero";
import { LedgerDemo } from "@/components/ledger-demo";
import { CodeContrast } from "@/components/code-contrast";
import { ConceptMap } from "@/components/concept-map";
import { Lifecycle } from "@/components/lifecycle";
import { RunIt } from "@/components/run-it";
import { SiteFooter } from "@/components/site-footer";

export default function Home() {
  return (
    <main className="flex flex-col">
      <Hero />

      <section id="demo" className="scroll-mt-8 border-y border-line bg-bg-sunken/40 py-20">
        <div className="mx-auto mb-10 w-full max-w-6xl px-5">
          <p className="eyebrow mb-4">Watch the privacy hold</p>
          <h2 className="max-w-2xl font-display text-3xl leading-tight sm:text-4xl">
            Place a sealed bid. See exactly what each party is,{" "}
            <span className="text-vault">and isn&apos;t</span>, allowed to read.
          </h2>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Four parties, four ledgers. The auctioneer co-signs every bid, so it sees
            all of them. Each bidder signs only their own. Flip to{" "}
            <span className="text-signal">EVM</span>{" "}
            and every redaction bar drops at once: the difference between a private
            ledger and a public one, in a click. Then settle: the winner&apos;s funds
            pay the seller and losers are refunded atomically, and even then you only
            ever see your own money move.
          </p>
        </div>
        <div className="px-5">
          <LedgerDemo />
        </div>
      </section>

      <CodeContrast />

      <ConceptMap />
      <Lifecycle />
      <RunIt />
      <SiteFooter />
    </main>
  );
}
