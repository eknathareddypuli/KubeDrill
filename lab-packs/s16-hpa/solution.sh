#!/usr/bin/env bash
# KubeDrill lab pack: Autoscale a Deployment with HPA (s16-hpa)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s16-hpa. Try the lab first.
kubectl autoscale deployment shop --min=2 --max=6 --cpu-percent=50
kubectl get hpa
