#!/usr/bin/env bash
# KubeDrill lab pack: YAML repair: the tab character (s143-yaml-tab)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace yr-tab --ignore-not-found

