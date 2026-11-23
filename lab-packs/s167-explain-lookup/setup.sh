#!/usr/bin/env bash
# KubeDrill lab pack: Documentation lookup: find the field in kubectl explain (s167-explain-lookup)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Documentation lookup: find the field in kubectl explain"
kubectl create namespace default --dry-run=client -o yaml | kubectl apply -f -



kubectl config set-context --current --namespace=default >/dev/null
echo "✔ Ready. Namespace: default. Read README.md, fix the cluster, then run ./check.sh"
