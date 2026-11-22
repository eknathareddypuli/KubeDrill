#!/usr/bin/env bash
# KubeDrill lab pack: CreateContainerConfigError: missing Secret (s18-secret-env)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s18-secret-env. Try the lab first.
kubectl create secret generic db-creds --from-literal=password=s3cret -n vault
kubectl get pods -n vault
