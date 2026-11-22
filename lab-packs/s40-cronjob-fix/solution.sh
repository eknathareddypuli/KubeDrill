#!/usr/bin/env bash
# KubeDrill lab pack: CronJob never runs: suspended + wrong schedule (s40-cronjob-fix)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s40-cronjob-fix. Try the lab first.
kubectl patch cronjob backup -n cron -p '{"spec":{"schedule":"*/15 * * * *","suspend":false}}'
kubectl get cronjob -n cron
