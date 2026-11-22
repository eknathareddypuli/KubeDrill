#!/usr/bin/env bash
# KubeDrill lab pack: Quota and LimitRange: who spent the CPU? (s119-quota-limitrange)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace team-b --ignore-not-found

