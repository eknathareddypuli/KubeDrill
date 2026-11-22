#!/usr/bin/env bash
# KubeDrill lab pack: A failing Job: stop the retries, fix, and tidy up (s122-job-backoff)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s122-job-backoff. Try the lab first.
kubectl get job export -n batchq
kubectl delete job export -n batchq
kubectl apply -f - <<'EOF'
apiVersion: batch/v1
kind: Job
metadata:
  name: export
  namespace: batchq
spec:
  backoffLimit: 1
  activeDeadlineSeconds: 120
  ttlSecondsAfterFinished: 600
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: export
        image: busybox:1.36
        command: ["sh", "-c", "echo exporting"]
EOF
kubectl get job export -n batchq
