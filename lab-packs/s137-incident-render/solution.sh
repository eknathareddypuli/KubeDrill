#!/usr/bin/env bash
# KubeDrill lab pack: INCIDENT: render workers will not run (leave the sick node alone) (s137-incident-render)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s137-incident-render. Try the lab first.
kubectl describe pod -n inc-render
kubectl uncordon worker1
kubectl label node worker1 disk=ssd
kubectl patch resourcequota render-pods -n inc-render -p '{"spec":{"hard":{"pods":"3"}}}'
kubectl get pods -n inc-render -o wide
