#!/usr/bin/env bash
# KubeDrill lab pack: Falco: fix a noisy, uninformative shell rule (s153-falco-rule)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s153-falco-rule. Try the lab first.
cat > $HOME/falco_rules.local.yaml <<'EOF'
- rule: Shell in container
  desc: A shell was started inside a container
  condition: spawned_process and container and proc.name in (bash, sh, zsh)
  output: shell in container (user=%user.name container=%container.id cmd=%proc.cmdline)
  priority: WARNING
EOF
