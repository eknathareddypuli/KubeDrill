#!/usr/bin/env bash
# KubeDrill lab pack: Falco: fix a noisy, uninformative shell rule (s153-falco-rule)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: The condition requires a spawned process inside a container, for a shell'
chk 'The condition requires a spawned process inside a container, for a shell' '[ -f "$HOME/falco_rules.local.yaml" ] && grep -Eq -- '\''^\s*condition:.*spawned_process'\'' "$HOME/falco_rules.local.yaml" && [ -f "$HOME/falco_rules.local.yaml" ] && grep -Eq -- '\''^\s*condition:.*\bcontainer\b'\'' "$HOME/falco_rules.local.yaml" && [ -f "$HOME/falco_rules.local.yaml" ] && grep -Eq -- '\''^\s*condition:.*proc\.name\s+in\s*\('\'' "$HOME/falco_rules.local.yaml"'
echo 'Task 2: The alert names the container and the command line, with priority WARNING or higher'
chk 'The alert names the container and the command line, with priority WARNING or higher' '[ -f "$HOME/falco_rules.local.yaml" ] && grep -Eq -- '\''^\s*output:.*%container\.id'\'' "$HOME/falco_rules.local.yaml" && [ -f "$HOME/falco_rules.local.yaml" ] && grep -Eq -- '\''^\s*output:.*%proc\.cmdline'\'' "$HOME/falco_rules.local.yaml" && [ -f "$HOME/falco_rules.local.yaml" ] && grep -Eq -- '\''^\s*priority:\s*(WARNING|ERROR|CRITICAL|ALERT|EMERGENCY)\s*$'\'' "$HOME/falco_rules.local.yaml"'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail
