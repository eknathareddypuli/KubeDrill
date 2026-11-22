#!/usr/bin/env bash
# KubeDrill lab pack: CronJob: no overlap, tidy history (s104-cronjob-policy)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s104-cronjob-policy. Try the lab first.
kubectl patch cronjob cleanup -n cron -p '{"spec":{"schedule":"*/10 * * * *","concurrencyPolicy":"Forbid","successfulJobsHistoryLimit":1,"failedJobsHistoryLimit":2,"startingDeadlineSeconds":60}}'
kubectl get cronjob cleanup -n cron
