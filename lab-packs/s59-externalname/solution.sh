#!/usr/bin/env bash
# KubeDrill lab pack: ExternalName Service for an outside database (s59-externalname)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s59-externalname. Try the lab first.
kubectl delete svc legacy-db -n ext
kubectl create service externalname legacy-db --external-name db.example.com -n ext
kubectl get svc legacy-db -n ext
