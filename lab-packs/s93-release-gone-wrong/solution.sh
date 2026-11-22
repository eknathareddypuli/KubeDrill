#!/usr/bin/env bash
# KubeDrill lab pack: Incident: the release that never finishes (s93-release-gone-wrong)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s93-release-gone-wrong. Try the lab first.
kubectl rollout status deploy/portal -n rel --timeout=5s
kubectl patch cm portal-config -n rel -p '{"data":{"FEATURE_FLAGS":"none"}}'
kubectl patch deploy portal -n rel --type=json -p '[{"op":"replace","path":"/spec/template/spec/containers/0/readinessProbe/httpGet/path","value":"/"}]'
kubectl rollout restart deploy/portal -n rel
kubectl get pods -n rel
