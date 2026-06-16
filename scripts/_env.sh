#!/usr/bin/env bash
# Shared environment setup, sourced by the other scripts. It locates dpm and a
# Java 17+ runtime so the commands work whether or not your shell profile already
# exports them. Safe to source more than once.

# Foundry installs to ~/.foundry/bin by default.
if ! command -v forge >/dev/null 2>&1 && [ -x "$HOME/.foundry/bin/forge" ]; then
  export PATH="$HOME/.foundry/bin:$PATH"
fi

# dpm (the Daml package manager) installs to ~/.dpm/bin by default.
if ! command -v dpm >/dev/null 2>&1 && [ -x "$HOME/.dpm/bin/dpm" ]; then
  export PATH="$HOME/.dpm/bin:$PATH"
fi

# dpm needs a working Java 17+ runtime. Note `java -version` (not `command -v
# java`): macOS ships a /usr/bin/java stub that exists but errors until a real
# JDK is installed. Honour a working JAVA_HOME, else try java_home, then common
# Homebrew / Linux openjdk locations (the Homebrew keg is not always registered
# with java_home).
if ! java -version >/dev/null 2>&1; then
  JH=""
  if [ -n "${JAVA_HOME:-}" ] && [ -x "$JAVA_HOME/bin/java" ]; then
    JH="$JAVA_HOME"
  elif [ -x /usr/libexec/java_home ]; then
    JH="$(/usr/libexec/java_home -v 17 2>/dev/null || true)"
  fi
  if [ -z "$JH" ]; then
    for d in /opt/homebrew/opt/openjdk@17 /opt/homebrew/opt/openjdk \
             /usr/local/opt/openjdk@17 /usr/local/opt/openjdk \
             /usr/lib/jvm/java-17-openjdk /usr/lib/jvm/temurin-17-jdk; do
      if [ -x "$d/bin/java" ]; then JH="$d"; break; fi
    done
  fi
  if [ -n "$JH" ]; then export JAVA_HOME="$JH"; export PATH="$JAVA_HOME/bin:$PATH"; fi
fi

# require <command> <install hint>
require() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "error: '$1' is not on your PATH." >&2
    echo "  $2" >&2
    exit 1
  fi
}
