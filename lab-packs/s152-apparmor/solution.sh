#!/usr/bin/env bash
# KubeDrill lab pack: AppArmor: write a profile and attach it with the current field (s152-apparmor)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s152-apparmor. Try the lab first.
kubectl patch deployment web -n cks-aa --type=json -p '[{"op":"remove","path":"/spec/template/metadata/annotations"},{"op":"add","path":"/spec/template/spec/containers/0/securityContext","value":{"appArmorProfile":{"type":"Localhost","localhostProfile":"k8s-deny-write"}}}]'
cat > $HOME/k8s-deny-write <<'EOF'
#include <tunables/global>
profile k8s-deny-write flags=(attach_disconnected) {
  #include <abstractions/base>
  file,
  deny /** w,
}
EOF
