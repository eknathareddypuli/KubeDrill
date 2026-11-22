#!/usr/bin/env bash
# KubeDrill lab pack: Incident: three faults, one outage (s28-incident)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s28-incident. Try the lab first.
kubectl set image deployment/frontend frontend=nginx:1.25
kubectl patch svc frontend -p '{"spec":{"selector":{"app":"frontend"}}}'
kubectl label node worker1 disk=ssd
kubectl rollout status deployment/frontend
