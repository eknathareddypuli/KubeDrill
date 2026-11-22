#!/usr/bin/env bash
# KubeDrill lab pack: CRD: the custom resource is rejected by its schema (s149-crd-schema)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s149-crd-schema. Try the lab first.
cat > $HOME/nightly.yaml <<'EOF'
apiVersion: stable.example.com/v1
kind: Backup
metadata:
  name: nightly
  namespace: ops
spec:
  schedule: "0 2 * * *"
  keep: 7
  tier: pro
EOF
kubectl apply -f $HOME/nightly.yaml
