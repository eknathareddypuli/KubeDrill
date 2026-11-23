#!/usr/bin/env bash
# KubeDrill lab pack: CAPSTONE (CKS): harden the payments namespace (s172-capstone-cks)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: CAPSTONE (CKS): harden the payments namespace"
kubectl create namespace cap-cks --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: cap-cks

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: pin-images
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
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Secret
metadata:
  name: pay-key
  namespace: cap-cks
stringData:
  key: k-123

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pay
  namespace: cap-cks
spec:
  replicas: 1
  selector:
    matchLabels:
      app: pay
  template:
    metadata:
      labels:
        app: pay
    spec:
      containers:
      - name: pay
        image: nginxinc/nginx-unprivileged:latest
        env:
        - name: API_KEY
          valueFrom:
            secretKeyRef:
              name: pay-key
              key: key
        securityContext:
          runAsUser: 0
          allowPrivilegeEscalation: true

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Service
metadata:
  name: pay
  namespace: cap-cks
spec:
  selector:
    app: pay
  ports:
  - port: 80
    targetPort: 8080

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Pod
metadata:
  name: gateway
  namespace: cap-cks
  labels:
    app: gateway
spec:
  containers:
  - name: c
    image: busybox:1.36
    command: ["sleep", "3600"]

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Pod
metadata:
  name: intruder
  namespace: cap-cks
  labels:
    app: other
spec:
  containers:
  - name: c
    image: busybox:1.36
    command: ["sleep", "3600"]

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Pod
metadata:
  name: debug-tools
  namespace: cap-cks
spec:
  hostPID: true
  containers:
  - name: d
    image: busybox:1.36
    command: ["sleep", "3600"]
    securityContext:
      privileged: true

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: cap-default-admin
subjects:
- kind: ServiceAccount
  name: default
  namespace: cap-cks
roleRef:
  apiGroup: rbac.authorization.k8s.io
  kind: ClusterRole
  name: cluster-admin

KUBEDRILL_EOF


kubectl config set-context --current --namespace=cap-cks >/dev/null
echo "✔ Ready. Namespace: cap-cks. Read README.md, fix the cluster, then run ./check.sh"
