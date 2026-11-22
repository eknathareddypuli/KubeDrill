#!/usr/bin/env bash
# KubeDrill lab pack: Imperative speed run (CKAD style) (s66-imperative-speedrun)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s66-imperative-speedrun. Try the lab first.
kubectl run p1 --image=nginx:1.25 --labels=tier=web -n fast
kubectl create deployment api --image=httpd:2.4 --replicas=3 -n fast
kubectl expose deployment api --name=api-svc --port=80 -n fast
kubectl create job once --image=busybox:1.36 -n fast -- echo hi
