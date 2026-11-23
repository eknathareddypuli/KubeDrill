#!/usr/bin/env bash
# KubeDrill lab pack: Resize a running pod without restarting it (s165-inplace-resize)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s165-inplace-resize. Try the lab first.
kubectl patch pod worker -n resize --subresource resize --patch '{"spec":{"containers":[{"name":"worker","resources":{"requests":{"cpu":"400m"},"limits":{"cpu":"400m"}}}]}}'
kubectl get pod worker -n resize -o jsonpath='{.status.containerStatuses[0].resources}'
