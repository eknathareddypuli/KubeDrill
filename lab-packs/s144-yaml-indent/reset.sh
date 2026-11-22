#!/usr/bin/env bash
# KubeDrill lab pack: YAML repair: wrong indentation (s144-yaml-indent)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace yr-indent --ignore-not-found

