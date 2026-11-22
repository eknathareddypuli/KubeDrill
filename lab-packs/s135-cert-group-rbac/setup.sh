#!/usr/bin/env bash
# KubeDrill lab pack: Auditors cannot read pods: bind the group the certificate carries (s135-cert-group-rbac)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Auditors cannot read pods: bind the group the certificate carries"
kubectl create namespace default --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: pod-viewer
rules:
- apiGroups: [""]
  resources: ["pods"]
  verbs: ["get", "list", "watch"]

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRoleBinding
metadata:
  name: auditors-view
roleRef: {apiGroup: rbac.authorization.k8s.io, kind: ClusterRole, name: pod-viewer}
subjects:
- {apiGroup: rbac.authorization.k8s.io, kind: User, name: auditors}

KUBEDRILL_EOF
openssl genrsa -out audit-bot.key 2048
openssl req -new -key audit-bot.key -out audit-bot.csr -subj "/CN=audit-bot/O=auditors"
kubectl apply -f - <<EOF
apiVersion: certificates.k8s.io/v1
kind: CertificateSigningRequest
metadata:
  name: audit-bot
spec:
  request: $(cat audit-bot.csr | base64 | tr -d "\n")
  signerName: kubernetes.io/kube-apiserver-client
  usages:
  - client auth
EOF
kubectl certificate approve audit-bot

kubectl config set-context --current --namespace=default >/dev/null
echo "✔ Ready. Namespace: default. Read README.md, fix the cluster, then run ./check.sh"
