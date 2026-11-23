#!/usr/bin/env bash
# KubeDrill lab pack: An admission policy that does nothing: add the binding (s158-vap-binding)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace default --ignore-not-found

