#!/usr/bin/env bash
# KubeDrill lab pack: Change config without a restart: volume vs env (s121-config-reload)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace reload --ignore-not-found

