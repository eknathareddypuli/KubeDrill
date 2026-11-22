#!/usr/bin/env bash
# KubeDrill lab pack: Required node affinity with no matching node (s36-node-affinity)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s36-node-affinity. Try the lab first.
kubectl label node worker1 topology.kubernetes.io/zone=zone-a
kubectl get pods -n zone -o wide
