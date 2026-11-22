#!/usr/bin/env bash
# KubeDrill lab pack: Jobs and CronJobs (s09-jobs)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s09-jobs. Try the lab first.
kubectl create job report --image=busybox:1.36 --dry-run=client -o yaml -- echo done > job.yaml
sed -i "s/^spec:/spec:\n  completions: 3/" job.yaml
kubectl apply -f job.yaml
kubectl create cronjob cleanup --image=busybox:1.36 --schedule="*/5 * * * *" -- echo cleaning
