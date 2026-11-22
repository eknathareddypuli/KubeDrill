#!/usr/bin/env bash
# KubeDrill lab pack: CRD: the custom resource is rejected by its schema (s149-crd-schema)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: CRD: the custom resource is rejected by its schema"
kubectl create namespace ops --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: ops

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apiextensions.k8s.io/v1
kind: CustomResourceDefinition
metadata:
  name: backups.stable.example.com
spec:
  group: stable.example.com
  scope: Namespaced
  names:
    kind: Backup
    plural: backups
    singular: backup
  versions:
  - name: v1
    served: true
    storage: true
    schema:
      openAPIV3Schema:
        type: object
        properties:
          spec:
            type: object
            required: ["schedule"]
            properties:
              schedule:
                type: string
              keep:
                type: integer
                minimum: 1
              tier:
                type: string
                enum: ["free", "pro"]

KUBEDRILL_EOF

cat > "$HOME/nightly.yaml" <<'KUBEDRILL_EOF'
apiVersion: stable.example.com/v1
kind: Backup
metadata:
  name: nightly
  namespace: ops
spec:
  keep: 0
  tier: gold

KUBEDRILL_EOF
kubectl config set-context --current --namespace=ops >/dev/null
echo "✔ Ready. Namespace: ops. Read README.md, fix the cluster, then run ./check.sh"
