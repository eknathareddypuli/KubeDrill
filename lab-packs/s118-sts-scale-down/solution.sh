#!/usr/bin/env bash
# KubeDrill lab pack: StatefulSet scale-down: what happens to the volumes? (s118-sts-scale-down)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s118-sts-scale-down. Try the lab first.
kubectl scale sts db --replicas=2
kubectl get pvc
kubectl delete pvc data-db-2
kubectl get pods,pvc
