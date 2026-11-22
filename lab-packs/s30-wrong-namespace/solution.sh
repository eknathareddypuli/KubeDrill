#!/usr/bin/env bash
# KubeDrill lab pack: Deployed into the wrong namespace (s30-wrong-namespace)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s30-wrong-namespace. Try the lab first.
kubectl create deployment portal --image=nginx:1.25 --replicas=3 -n staging
kubectl delete deployment portal -n default
