#!/usr/bin/env bash
# KubeDrill lab pack: Pending CSRs: approve one, deny the dangerous one (s131-review-csrs)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s131-review-csrs. Try the lab first.
kubectl get csr build-bot -o jsonpath='{.spec.request}' | base64 -d | openssl req -noout -subject
echo system:masters > finding.txt
kubectl certificate approve dev-ci
kubectl certificate deny build-bot
kubectl get csr
