#!/usr/bin/env bash
# KubeDrill lab pack: Version skew: which components are out of policy? (s155-version-skew)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Version skew: which components are out of policy?"
kubectl create namespace default --dry-run=client -o yaml | kubectl apply -f -


cat > "$HOME/versions.txt" <<'KUBEDRILL_EOF'
COMPONENT VERSION
kube-apiserver v1.30.2
kube-controller-manager v1.30.0
kube-scheduler v1.28.9
kubelet-worker1 v1.30.2
kubelet-worker2 v1.27.3
kubelet-worker3 v1.26.5
kubelet-worker4 v1.31.0
kubectl-admin v1.31.1

KUBEDRILL_EOF
kubectl config set-context --current --namespace=default >/dev/null
echo "✔ Ready. Namespace: default. Read README.md, fix the cluster, then run ./check.sh"
