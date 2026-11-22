#!/usr/bin/env bash
# KubeDrill lab pack: Init:CrashLoopBackOff — failing init container (s31-init-container)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s31-init-container. Try the lab first.
kubectl logs deploy/app -c prep
kubectl patch deployment app -p '{"spec":{"template":{"spec":{"initContainers":[{"name":"prep","command":["sh","-c","echo preparing; exit 0"]}]}}}}'
kubectl rollout status deployment/app
