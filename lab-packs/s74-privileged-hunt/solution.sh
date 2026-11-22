#!/usr/bin/env bash
# KubeDrill lab pack: Hunt the privileged workloads (s74-privileged-hunt)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s74-privileged-hunt. Try the lab first.
kubectl patch deploy ledger -n payments --type=json -p '[{"op":"replace","path":"/spec/template/spec/containers/0/securityContext/privileged","value":false}]'
kubectl patch deploy reports -n payments --type=json -p '[{"op":"remove","path":"/spec/template/spec/hostPID"}]'
kubectl patch deploy cache -n payments --type=json -p '[{"op":"remove","path":"/spec/template/spec/containers/0/volumeMounts"},{"op":"remove","path":"/spec/template/spec/volumes"}]'
kubectl get pods -n payments
