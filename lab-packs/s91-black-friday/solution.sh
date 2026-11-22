#!/usr/bin/env bash
# KubeDrill lab pack: Incident: Black Friday checkout (s91-black-friday)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s91-black-friday. Try the lab first.
kubectl set image deploy/checkout app=nginx:1.25 -n shop
kubectl patch resourcequota shop-budget -n shop -p '{"spec":{"hard":{"pods":"8"}}}'
kubectl patch svc checkout -n shop --type=json -p '[{"op":"replace","path":"/spec/selector/app","value":"checkout"}]'
kubectl exec tester -n shop -- wget -qO- checkout
