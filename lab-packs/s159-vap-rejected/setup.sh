#!/usr/bin/env bash
# KubeDrill lab pack: Your deployment is rejected by an admission policy (s159-vap-rejected)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Your deployment is rejected by an admission policy"
kubectl create namespace teamx --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: teamx

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: team-rules
spec:
  failurePolicy: Fail
  matchConstraints:
    resourceRules:
    - apiGroups: ["apps"]
      apiVersions: ["v1"]
      operations: ["CREATE", "UPDATE"]
      resources: ["deployments"]
  validations:
  - expression: "object.spec.replicas <= 4"
    message: "a team deployment may run at most 4 replicas"
  - expression: "has(object.metadata.labels) && 'owner' in object.metadata.labels"
    message: "every deployment needs an owner label"
  - expression: "object.spec.template.spec.containers.all(c, c.image.startsWith('registry.k8s.io/'))"
    message: "images must come from registry.k8s.io"

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicyBinding
metadata:
  name: team-rules-teamx
spec:
  policyName: team-rules
  validationActions: ["Deny"]
  matchResources:
    namespaceSelector:
      matchLabels:
        kubernetes.io/metadata.name: teamx

KUBEDRILL_EOF

cat > "$HOME/web.yaml" <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  namespace: teamx
spec:
  replicas: 8
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
      - name: web
        image: docker.io/library/nginx:1.25

KUBEDRILL_EOF
kubectl config set-context --current --namespace=teamx >/dev/null
echo "✔ Ready. Namespace: teamx. Read README.md, fix the cluster, then run ./check.sh"
