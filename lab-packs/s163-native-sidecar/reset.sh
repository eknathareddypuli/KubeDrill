#!/usr/bin/env bash
# KubeDrill lab pack: Make the log shipper a native sidecar (s163-native-sidecar)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace side --ignore-not-found

