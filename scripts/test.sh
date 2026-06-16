#!/usr/bin/env bash
# Run both test suites: the Solidity (Foundry) reference and the Daml (DPM) version.
# This is the same thing CI runs on every push.
set -euo pipefail
cd "$(dirname "$0")/.."
# shellcheck source=/dev/null
source scripts/_env.sh

echo "==> Solidity (Foundry): 12 tests"
require forge "Install Foundry: https://book.getfoundry.sh/getting-started/installation"
( cd solidity && forge test )

echo
echo "==> Daml (DPM): 7 scripts"
require dpm "Install DPM: curl -fsSL https://get.digitalasset.com/install/install.sh | sh && dpm install 3.4.11"
require java "Install a Java 17+ runtime (for example Temurin 17)."
( cd daml && dpm build && dpm test )

echo
echo "==> all green"
