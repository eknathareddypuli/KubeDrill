#!/usr/bin/env bash
# KubeDrill lab pack: Read a Trivy report: what must be fixed first (s154-trivy-report)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: Read a Trivy report: what must be fixed first"
kubectl create namespace default --dry-run=client -o yaml | kubectl apply -f -


cat > "$HOME/trivy-report.txt" <<'KUBEDRILL_EOF'
IMAGE PACKAGE CVE SEVERITY FIXED
nginx:1.19 openssl CVE-2022-0778 HIGH 1.1.1n
nginx:1.19 zlib CVE-2022-37434 CRITICAL 1.2.12
redis:6.0 glibc CVE-2021-33574 CRITICAL 2.31
redis:6.0 libxml2 CVE-2022-2309 MEDIUM -
alpine:3.12 busybox CVE-2022-28391 HIGH 1.31.1-r10
alpine:3.12 musl CVE-2020-28928 MEDIUM 1.2.2
app:v2 curl CVE-2023-38545 CRITICAL 8.4.0

KUBEDRILL_EOF
kubectl config set-context --current --namespace=default >/dev/null
echo "✔ Ready. Namespace: default. Read README.md, fix the cluster, then run ./check.sh"
