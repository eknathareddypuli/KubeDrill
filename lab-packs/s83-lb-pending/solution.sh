#!/usr/bin/env bash
# KubeDrill lab pack: LoadBalancer stuck on <pending> (s83-lb-pending)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s83-lb-pending. Try the lab first.
kubectl get svc web -n shop
kubectl patch svc web -n shop -p '{"spec":{"type":"NodePort"}}'
kubectl get endpoints web -n shop
