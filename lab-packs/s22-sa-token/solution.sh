#!/usr/bin/env bash
# KubeDrill lab pack: Harden ServiceAccount token mounting (s22-sa-token)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s22-sa-token. Try the lab first.
kubectl create serviceaccount web-sa
kubectl patch sa web-sa -p '{"automountServiceAccountToken":false}'
kubectl patch deployment web -p '{"spec":{"template":{"spec":{"serviceAccountName":"web-sa","automountServiceAccountToken":false}}}}'
kubectl rollout status deployment/web
