#!/usr/bin/env bash
# KubeDrill lab pack: System hardening: seccomp RuntimeDefault (s109-seccomp-default)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s109-seccomp-default. Try the lab first.
kubectl patch deployment api -n sys --type=json -p '[{"op":"add","path":"/spec/template/spec/securityContext","value":{"seccompProfile":{"type":"RuntimeDefault"}}},{"op":"add","path":"/spec/template/spec/containers/0/securityContext","value":{"allowPrivilegeEscalation":false,"readOnlyRootFilesystem":true,"capabilities":{"drop":["ALL"]}}}]'
kubectl rollout status deployment/api -n sys
