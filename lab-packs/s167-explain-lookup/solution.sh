#!/usr/bin/env bash
# KubeDrill lab pack: Documentation lookup: find the field in kubectl explain (s167-explain-lookup)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s167-explain-lookup. Try the lab first.
kubectl explain deployment.spec.strategy.rollingUpdate
kubectl explain cronjob.spec.concurrencyPolicy
printf 'q1=maxSurge\nq2=Allow,Forbid,Replace\nq3=integer\nq4=Local\n' > $HOME/answers.txt
