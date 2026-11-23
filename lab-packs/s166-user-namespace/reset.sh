#!/usr/bin/env bash
# KubeDrill lab pack: Map root in the container to a harmless host user (s166-user-namespace)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace userns --ignore-not-found

