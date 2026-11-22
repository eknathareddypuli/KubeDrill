#!/usr/bin/env bash
# KubeDrill lab pack: Missing ConfigMap key breaks the pod (s32-cm-env-missing)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s32-cm-env-missing. Try the lab first.
kubectl create configmap site-config --from-literal=theme=dark -n cfg
kubectl get pods -n cfg
