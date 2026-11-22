#!/usr/bin/env bash
# KubeDrill lab pack: Every node is tainted — add a toleration (s35-taint-toleration)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s35-taint-toleration. Try the lab first.
kubectl patch deployment etl -n dedic -p '{"spec":{"template":{"spec":{"tolerations":[{"key":"team","operator":"Equal","value":"data","effect":"NoSchedule"}]}}}}'
kubectl rollout status deployment/etl -n dedic
