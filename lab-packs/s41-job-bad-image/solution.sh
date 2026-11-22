#!/usr/bin/env bash
# KubeDrill lab pack: Job stuck: ImagePullBackOff (s41-job-bad-image)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s41-job-bad-image. Try the lab first.
kubectl delete job migrate -n jobs
kubectl create job migrate --image=busybox:1.36 -n jobs -- sh -c "echo migrated"
kubectl get job -n jobs
