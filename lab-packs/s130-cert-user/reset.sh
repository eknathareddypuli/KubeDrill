#!/usr/bin/env bash
# KubeDrill lab pack: Onboard a developer: client certificate, RBAC, kubeconfig (s130-cert-user)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "Removing lab namespaces…"
kubectl delete namespace dev --ignore-not-found
kubectl config delete-context jane-dev
kubectl config delete-user jane
kubectl delete csr jane --ignore-not-found
