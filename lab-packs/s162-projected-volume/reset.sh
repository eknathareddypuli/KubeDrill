#!/usr/bin/env bash
# KubeDrill lab pack: One directory from a ConfigMap, a Secret and the Downward API (s162-projected-volume)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace proj --ignore-not-found

