#!/usr/bin/env bash
# KubeDrill lab pack: Pending CSRs: approve one, deny the dangerous one (s131-review-csrs)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Pending CSRs: approve one, deny the dangerous one"
kubectl create namespace default --dry-run=client -o yaml | kubectl apply -f -

openssl genrsa -out dev-ci.key 2048
openssl req -new -key dev-ci.key -out dev-ci.csr -subj "/CN=dev-ci/O=ci"
kubectl apply -f - <<EOF
apiVersion: certificates.k8s.io/v1
kind: CertificateSigningRequest
metadata:
  name: dev-ci
spec:
  request: $(cat dev-ci.csr | base64 | tr -d "\n")
  signerName: kubernetes.io/kube-apiserver-client
  usages:
  - client auth
EOF
openssl genrsa -out old-laptop.key 2048
openssl req -new -key old-laptop.key -out old-laptop.csr -subj "/CN=old-laptop/O=staff"
kubectl apply -f - <<EOF
apiVersion: certificates.k8s.io/v1
kind: CertificateSigningRequest
metadata:
  name: old-laptop
spec:
  request: $(cat old-laptop.csr | base64 | tr -d "\n")
  signerName: kubernetes.io/kube-apiserver-client
  usages:
  - client auth
EOF
openssl genrsa -out build-bot.key 2048
openssl req -new -key build-bot.key -out build-bot.csr -subj "/CN=build-bot/O=system:masters"
kubectl apply -f - <<EOF
apiVersion: certificates.k8s.io/v1
kind: CertificateSigningRequest
metadata:
  name: build-bot
spec:
  request: $(cat build-bot.csr | base64 | tr -d "\n")
  signerName: kubernetes.io/kube-apiserver-client
  usages:
  - client auth
EOF

kubectl config set-context --current --namespace=default >/dev/null
echo "✔ Ready. Namespace: default. Read README.md, fix the cluster, then run ./check.sh"
