#!/usr/bin/env bash
# KubeDrill lab pack: Change the setting in an immutable ConfigMap (s161-immutable-config)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s161-immutable-config. Try the lab first.
kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: web-config-v2
  namespace: conf
immutable: true
data:
  LOG_LEVEL: debug
EOF
kubectl patch deployment web -n conf --type=json -p '[{"op":"replace","path":"/spec/template/spec/containers/0/envFrom/0/configMapRef/name","value":"web-config-v2"}]'
kubectl rollout status deployment/web -n conf
