#!/usr/bin/env bash
# KubeDrill lab pack: A developer laptop was stolen: remove what the certificate can do (s132-leaked-cert)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: A developer laptop was stolen: remove what the certificate can do"
kubectl create namespace sales --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: sales

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: finance

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: pod-reader
  namespace: sales
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch"]

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: rbac.authorization.k8s.io/v1
kind: Role
metadata:
  name: pod-reader
  namespace: finance
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch"]

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: cluster-pod-reader
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list"]

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: rb-bob
  namespace: sales
roleRef: {apiGroup: rbac.authorization.k8s.io, kind: Role, name: pod-reader}
subjects:
- {apiGroup: rbac.authorization.k8s.io, kind: User, name: bob}

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: rb-alice
  namespace: sales
roleRef: {apiGroup: rbac.authorization.k8s.io, kind: Role, name: pod-reader}
subjects:
- {apiGroup: rbac.authorization.k8s.io, kind: User, name: alice}

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: crb-bob
roleRef: {apiGroup: rbac.authorization.k8s.io, kind: ClusterRole, name: cluster-pod-reader}
subjects:
- {apiGroup: rbac.authorization.k8s.io, kind: User, name: bob}

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: rbac.authorization.k8s.io/v1
kind: RoleBinding
metadata:
  name: rb-contractors
  namespace: finance
roleRef: {apiGroup: rbac.authorization.k8s.io, kind: Role, name: pod-reader}
subjects:
- {apiGroup: rbac.authorization.k8s.io, kind: Group, name: contractors}

KUBEDRILL_EOF
openssl genrsa -out bob.key 2048
openssl req -new -key bob.key -out bob.csr -subj "/CN=bob/O=contractors"
kubectl apply -f - <<EOF
apiVersion: certificates.k8s.io/v1
kind: CertificateSigningRequest
metadata:
  name: bob
spec:
  request: $(cat bob.csr | base64 | tr -d "\n")
  signerName: kubernetes.io/kube-apiserver-client
  expirationSeconds: 31536000
  usages:
  - client auth
EOF
kubectl certificate approve bob

kubectl config set-context --current --namespace=sales >/dev/null
echo "✔ Ready. Namespace: sales. Read README.md, fix the cluster, then run ./check.sh"
