#!/usr/bin/env bash
# KubeDrill lab pack: Find the pod that keeps restarting (s67-find-restarts)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s67-find-restarts. Try the lab first.
kubectl get pods -n rs
kubectl get pods -n rs --sort-by=.status.containerStatuses[0].restartCount -o name | tail -1 > answer.txt
