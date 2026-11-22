#!/usr/bin/env bash
# KubeDrill lab pack: HPA shows <unknown>: no CPU requests (s100-hpa-unknown)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s100-hpa-unknown. Try the lab first.
kubectl describe hpa web -n scale
kubectl set resources deployment web -n scale --requests=cpu=100m
kubectl get hpa -n scale
