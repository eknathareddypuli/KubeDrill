#!/usr/bin/env bash
# KubeDrill lab pack: Pending: nodeSelector matches no node (s34-nodeselector)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s34-nodeselector. Try the lab first.
kubectl label node worker2 gpu=true
kubectl get pods -n sched -o wide
