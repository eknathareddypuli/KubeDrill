#!/usr/bin/env bash
# KubeDrill lab pack: Nothing resolves: CoreDNS scaled to zero (s82-coredns-down)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s82-coredns-down. Try the lab first.
kubectl get endpoints kube-dns -n kube-system
kubectl scale deploy coredns -n kube-system --replicas=2
kubectl exec client -n shop -- wget -qO- server
