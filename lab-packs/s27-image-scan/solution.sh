#!/usr/bin/env bash
# KubeDrill lab pack: Scan images and replace the vulnerable ones (s27-image-scan)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s27-image-scan. Try the lab first.
trivy image nginx:1.19
trivy image nginx:1.27-alpine
kubectl set image deployment/web web=nginx:1.27-alpine
kubectl set image deployment/cache cache=redis:7-alpine
kubectl get pods
