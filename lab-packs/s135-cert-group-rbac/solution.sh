#!/usr/bin/env bash
# KubeDrill lab pack: Auditors cannot read pods: bind the group the certificate carries (s135-cert-group-rbac)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s135-cert-group-rbac. Try the lab first.
kubectl get csr audit-bot -o jsonpath='{.spec.request}' | base64 -d | openssl req -noout -subject
echo auditors > bot-group.txt
kubectl patch clusterrolebinding auditors-view --type=json -p='[{"op":"replace","path":"/subjects/0/kind","value":"Group"}]'
kubectl auth can-i list pods -A --as audit-bot --as-group auditors
