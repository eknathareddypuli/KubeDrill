#!/usr/bin/env bash
# KubeDrill lab pack: INCIDENT: frontend cannot reach backend (three layers) (s139-incident-backend)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace inc-net --ignore-not-found

