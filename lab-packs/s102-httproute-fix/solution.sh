#!/usr/bin/env bash
# KubeDrill lab pack: Gateway API: the route attaches to nothing (s102-httproute-fix)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s102-httproute-fix. Try the lab first.
kubectl patch httproute shop -n gw2 --type=json -p '[{"op":"replace","path":"/spec/parentRefs/0/name","value":"public"},{"op":"replace","path":"/spec/rules/0/backendRefs/0/port","value":80}]'
kubectl get httproute -n gw2
