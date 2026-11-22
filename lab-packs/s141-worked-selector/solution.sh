#!/usr/bin/env bash
# KubeDrill lab pack: Worked example: Service with no endpoints (watch, then do) (s141-worked-selector)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s141-worked-selector. Try the lab first.
kubectl get svc mine -n we-svc -o jsonpath={.spec.selector}
kubectl get pods -n we-svc --show-labels
kubectl patch svc mine -n we-svc -p '{"spec":{"selector":{"app":"mine"}}}'
kubectl get endpoints mine -n we-svc
