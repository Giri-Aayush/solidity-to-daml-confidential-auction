# Confidential Auction on Canton - one-command entry points.
# Run `make` (or `make help`) to see what is available.

.DEFAULT_GOAL := help

.PHONY: help test canton web

help: ## show this help
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36mmake %-8s\033[0m %s\n", $$1, $$2}'

test: ## run both test suites (Solidity + Daml), the same thing CI runs
	./scripts/test.sh

canton: ## run the auction on a real Canton node (boots a sandbox, runs the live proof)
	./scripts/canton-live.sh

web: ## run the explainer site locally (Next.js dev server on :3000)
	cd frontend && npm install && npm run dev
