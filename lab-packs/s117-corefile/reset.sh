#!/usr/bin/env bash
# KubeDrill lab pack: DNS is up but Service names do not resolve: the Corefile (s117-corefile)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace dns-lab --ignore-not-found

