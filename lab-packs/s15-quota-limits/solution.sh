#!/usr/bin/env bash
# KubeDrill lab pack: ResourceQuota blocks the rollout (s15-quota-limits)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s15-quota-limits. Try the lab first.
kubectl describe quota cpu-cap
kubectl scale deployment crunch --replicas=0
kubectl set resources deployment/crunch --requests=cpu=200m
kubectl scale deployment crunch --replicas=4
kubectl rollout status deployment/crunch
