#!/usr/bin/env bash
# See the auction run on a REAL Canton node, not the in-memory test ledger.
#
# It boots a full Canton participant in one process (dpm sandbox), uploads the
# auction package, and runs the privacy + token-standard-DvP proof against the
# live ledger API. Canton is shut down automatically when the script exits.
#
# No Docker required. Needs dpm + a Java 17+ runtime (see scripts/_env.sh).
set -euo pipefail
cd "$(dirname "$0")/.."
# shellcheck source=/dev/null
source scripts/_env.sh

require dpm "Install DPM: curl -fsSL https://get.digitalasset.com/install/install.sh | sh && dpm install 3.4.11"
require java "Install a Java 17+ runtime (for example Temurin 17)."

DAR=".daml/dist/confidential-auction-1.0.0.dar"
PORT=6865
LOG="$(mktemp -t canton-sandbox.XXXXXX)"

echo "==> building the DAR"
( cd daml && dpm build >/dev/null )

echo "==> booting Canton (this takes ~40s; logs: $LOG)"
( cd daml && exec dpm sandbox --no-tty --dar "$DAR" ) >"$LOG" 2>&1 &
SANDBOX_PID=$!

cleanup() {
  echo "==> stopping Canton"
  # Stop only the sandbox we launched - the dpm launcher and the Canton JVM it
  # spawned - never some other process that merely happens to hold the port.
  if [ -n "${SANDBOX_PID:-}" ]; then
    pkill -P "$SANDBOX_PID" 2>/dev/null || true
    kill "$SANDBOX_PID" 2>/dev/null || true
  fi
  rm -f "$LOG"
}
trap cleanup EXIT

printf "==> waiting for the ledger API on :%s " "$PORT"
ready=false
for _ in $(seq 1 120); do
  if grep -q "Canton sandbox is ready" "$LOG" 2>/dev/null; then ready=true; break; fi
  if grep -qiE "ERROR|Exception" "$LOG" 2>/dev/null; then echo; echo "Canton failed to start:"; tail -20 "$LOG"; exit 1; fi
  printf "."; sleep 2
done
if [ "$ready" != true ]; then
  echo; echo "timed out after ~4 min waiting for Canton to report ready:"; tail -20 "$LOG"; exit 1
fi
echo " ready"

echo "==> running Test:privacyAndSettlement against the live ledger"
( cd daml && dpm script --dar "$DAR" \
    --script-name Test:privacyAndSettlement \
    --ledger-host localhost --ledger-port "$PORT" )

echo
echo "==> success: the token-standard auction settled on a real Canton node."
echo "    (privacy held by content, the DvP balances checked out, all on the live ledger API)"
