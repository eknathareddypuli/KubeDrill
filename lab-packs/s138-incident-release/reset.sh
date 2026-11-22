#!/usr/bin/env bash
# KubeDrill lab pack: INCIDENT: release 42 broke `api` and `worker` (s138-incident-release)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace inc-api --ignore-not-found

