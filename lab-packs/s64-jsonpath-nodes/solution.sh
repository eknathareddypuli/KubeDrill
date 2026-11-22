#!/usr/bin/env bash
# KubeDrill lab pack: JSONPath: extract node names and images (s64-jsonpath-nodes)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s64-jsonpath-nodes. Try the lab first.
kubectl get nodes -o jsonpath='{.items[*].metadata.name}' > nodes.txt
kubectl get pods -n jp -o jsonpath='{.items[*].spec.containers[*].image}' > images.txt
cat nodes.txt
