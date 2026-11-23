#!/usr/bin/env bash
# KubeDrill lab pack: Debug a shell-less pod with an ephemeral container (s156-ephemeral-debug)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s156-ephemeral-debug. Try the lab first.
kubectl debug -n dbg api -it --image=busybox:1.36 --target=api -c inspector
kubectl get pod api -n dbg -o jsonpath='{.spec.ephemeralContainers[*].name}'
