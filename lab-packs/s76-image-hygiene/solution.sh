#!/usr/bin/env bash
# KubeDrill lab pack: Pin and vet container images (s76-image-hygiene)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s76-image-hygiene. Try the lab first.
kubectl set image deploy/web app=nginx:1.25.5 -n prod
kubectl set image deploy/api app=nginx:1.25.5 -n prod
kubectl set image deploy/worker app=nginx:1.25.5 -n prod
kubectl get pods -n prod
