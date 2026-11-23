#!/usr/bin/env bash
# KubeDrill lab pack: CAPSTONE (CKAD): ship the orders service (s171-capstone-ckad)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace cap-ckad --ignore-not-found

