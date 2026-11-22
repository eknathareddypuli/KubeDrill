#!/usr/bin/env bash
# KubeDrill lab pack: Job: completions, parallelism and a deadline (s103-job-parallel)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s103-job-parallel. Try the lab first.
kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: Job
metadata:
  name: import
  namespace: jobs2
spec:
  completions: 6
  parallelism: 2
  backoffLimit: 2
  activeDeadlineSeconds: 120
  template:
    spec:
      restartPolicy: OnFailure
      containers:
      - name: import
        image: busybox:1.36
        command: ["echo", "imported"]
EOF
kubectl get job import -n jobs2
