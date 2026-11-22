#!/usr/bin/env bash
# KubeDrill lab pack: Service has no endpoints (s04-no-endpoints)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s04-no-endpoints. Try the lab first.
kubectl patch svc frontend-svc -p '{"spec":{"selector":{"app":"frontend"}}}'
kubectl get ep frontend-svc
kubectl exec tester -- wget -qO- frontend-svc
