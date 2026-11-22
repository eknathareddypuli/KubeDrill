#!/usr/bin/env bash
# KubeDrill lab pack: INCIDENT: checkout is down (four faults, one symptom) (s136-incident-checkout)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace inc-checkout --ignore-not-found

