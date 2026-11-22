#!/usr/bin/env bash
# KubeDrill lab pack: Prod is down: ImagePullBackOff (s02-imagepull)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s02-imagepull. Try the lab first.
kubectl set image deployment/web web=nginx:1.25
kubectl rollout status deployment/web
