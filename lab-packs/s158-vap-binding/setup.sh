#!/usr/bin/env bash
# KubeDrill lab pack: An admission policy that does nothing: add the binding (s158-vap-binding)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: An admission policy that does nothing: add the binding"
kubectl create namespace default --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: shop-prod
  labels:
    env: prod

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: shop-dev
  labels:
    env: dev

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: no-latest
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
    - apiGroups: ["apps"]
      apiVersions: ["v1"]
      operations: ["CREATE", "UPDATE"]
      resources: ["deployments"]
  validations:
  - expression: "object.spec.template.spec.containers.all(c, c.image.contains(':') && !c.image.endsWith(':latest'))"
    message: "images must be pinned to a tag other than latest"

KUBEDRILL_EOF


kubectl config set-context --current --namespace=default >/dev/null
echo "✔ Ready. Namespace: default. Read README.md, fix the cluster, then run ./check.sh"
