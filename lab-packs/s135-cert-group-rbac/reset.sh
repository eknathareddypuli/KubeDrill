#!/usr/bin/env bash
# KubeDrill lab pack: Auditors cannot read pods: bind the group the certificate carries (s135-cert-group-rbac)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace default --ignore-not-found
kubectl delete csr audit-bot --ignore-not-found
kubectl delete clusterrolebinding auditors-view --ignore-not-found
kubectl delete clusterrole pod-viewer --ignore-not-found
