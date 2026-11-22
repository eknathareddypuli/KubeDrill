#!/usr/bin/env bash
# KubeDrill lab pack: A failing Job: stop the retries, fix, and tidy up (s122-job-backoff)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: A failing Job: stop the retries, fix, and tidy up"
kubectl create namespace batchq --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: batch/v1
kind: Job
metadata:
  name: export
  namespace: batchq
spec:
  backoffLimit: 6
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: export
        image: busybox:1.36
        command: ["sh", "-c", "exit 1"]

KUBEDRILL_EOF


kubectl config set-context --current --namespace=batchq >/dev/null
echo "✔ Ready. Namespace: batchq. Read README.md, fix the cluster, then run ./check.sh"
