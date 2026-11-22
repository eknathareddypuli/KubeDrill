#!/usr/bin/env bash
# KubeDrill lab pack: Falco: fix a noisy, uninformative shell rule (s153-falco-rule)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Falco: fix a noisy, uninformative shell rule"
kubectl create namespace default --dry-run=client -o yaml | kubectl apply -f -


cat > "$HOME/falco_rules.local.yaml" <<'KUBEDRILL_EOF'
- rule: Shell in container
  desc: A shell was started inside a container
  condition: proc.name = bash
  output: shell started (user=%user.name)
  priority: INFO

KUBEDRILL_EOF
kubectl config set-context --current --namespace=default >/dev/null
echo "✔ Ready. Namespace: default. Read README.md, fix the cluster, then run ./check.sh"
