#!/usr/bin/env bash
# KubeDrill lab pack: NetworkPolicy: ipBlock and a port range (s164-netpol-iprange)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace ranges --ignore-not-found

