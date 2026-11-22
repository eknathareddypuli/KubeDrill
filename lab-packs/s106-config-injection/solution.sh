#!/usr/bin/env bash
# KubeDrill lab pack: Inject config: envFrom and a read-only Secret volume (s106-config-injection)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s106-config-injection. Try the lab first.
kubectl patch deployment web -n cfg --type=json -p '[{"op":"add","path":"/spec/template/spec/containers/0/envFrom","value":[{"configMapRef":{"name":"app-config"}}]},{"op":"add","path":"/spec/template/spec/volumes","value":[{"name":"creds","secret":{"secretName":"app-creds"}}]},{"op":"add","path":"/spec/template/spec/containers/0/volumeMounts","value":[{"name":"creds","mountPath":"/etc/creds","readOnly":true}]}]'
kubectl rollout status deployment/web -n cfg
