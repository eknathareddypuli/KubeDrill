#!/usr/bin/env bash
# KubeDrill lab pack: AppArmor: write a profile and attach it with the current field (s152-apparmor)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace cks-aa --ignore-not-found

