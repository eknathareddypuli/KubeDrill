#!/usr/bin/env bash
# KubeDrill lab pack: INCIDENT: render workers will not run (leave the sick node alone) (s137-incident-render)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace inc-render --ignore-not-found

