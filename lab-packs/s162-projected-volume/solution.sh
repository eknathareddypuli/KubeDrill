#!/usr/bin/env bash
# KubeDrill lab pack: One directory from a ConfigMap, a Secret and the Downward API (s162-projected-volume)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s162-projected-volume. Try the lab first.
kubectl patch deployment agent -n proj --type=json -p '[{"op":"replace","path":"/spec/template/spec/volumes","value":[{"name":"agent-etc","projected":{"sources":[{"configMap":{"name":"agent-config"}},{"secret":{"name":"agent-token"}},{"downwardAPI":{"items":[{"path":"labels","fieldRef":{"fieldPath":"metadata.labels"}}]}}]}}]},{"op":"replace","path":"/spec/template/spec/containers/0/volumeMounts/0/name","value":"agent-etc"}]'
kubectl rollout status deployment/agent -n proj
