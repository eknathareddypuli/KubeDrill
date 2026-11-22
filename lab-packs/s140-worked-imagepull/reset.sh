#!/usr/bin/env bash
# KubeDrill lab pack: Worked example: ImagePullBackOff (watch, then do) (s140-worked-imagepull)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace we-image --ignore-not-found

