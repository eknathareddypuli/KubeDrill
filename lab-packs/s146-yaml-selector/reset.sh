#!/usr/bin/env bash
# KubeDrill lab pack: YAML repair: selector that matches nothing (s146-yaml-selector)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace yr-sel --ignore-not-found

