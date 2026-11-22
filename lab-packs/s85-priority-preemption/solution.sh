#!/usr/bin/env bash
# KubeDrill lab pack: Critical pods Pending: priority and preemption (s85-priority-preemption)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s85-priority-preemption. Try the lab first.
kubectl get pods -n batch
kubectl patch deploy payments -n batch --type=json -p '[{"op":"add","path":"/spec/template/spec/priorityClassName","value":"critical"}]'
kubectl get pods -n batch
