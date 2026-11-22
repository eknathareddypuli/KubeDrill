#!/usr/bin/env bash
# KubeDrill lab pack: A developer laptop was stolen: remove what the certificate can do (s132-leaked-cert)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace sales --ignore-not-found
kubectl delete csr bob --ignore-not-found
kubectl delete namespace sales finance --ignore-not-found
kubectl delete clusterrole cluster-pod-reader --ignore-not-found
kubectl delete clusterrolebinding crb-bob --ignore-not-found
