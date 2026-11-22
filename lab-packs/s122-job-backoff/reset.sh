#!/usr/bin/env bash
# KubeDrill lab pack: A failing Job: stop the retries, fix, and tidy up (s122-job-backoff)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace batchq --ignore-not-found

