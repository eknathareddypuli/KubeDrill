#!/usr/bin/env bash
# KubeDrill lab pack: StatefulSet scale-down: what happens to the volumes? (s118-sts-scale-down)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace ledger --ignore-not-found

