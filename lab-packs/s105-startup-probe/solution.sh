#!/usr/bin/env bash
# KubeDrill lab pack: Slow starter: add a startup probe (s105-startup-probe)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s105-startup-probe. Try the lab first.
kubectl patch deployment legacy -n slow --type=json -p '[{"op":"add","path":"/spec/template/spec/containers/0/startupProbe","value":{"httpGet":{"path":"/","port":80},"periodSeconds":10,"failureThreshold":30}}]'
kubectl rollout status deployment/legacy -n slow
