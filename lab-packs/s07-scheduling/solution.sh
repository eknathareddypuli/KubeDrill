#!/usr/bin/env bash
# KubeDrill lab pack: Taints, tolerations and nodeSelector (s07-scheduling)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s07-scheduling. Try the lab first.
kubectl label node worker1 accelerator=gpu
kubectl patch deployment trainer -p '{"spec":{"template":{"spec":{"tolerations":[{"key":"dedicated","operator":"Equal","value":"ml","effect":"NoSchedule"}]}}}}'
kubectl get pods -o wide
