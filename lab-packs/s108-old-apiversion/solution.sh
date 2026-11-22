#!/usr/bin/env bash
# KubeDrill lab pack: Fix a manifest that uses a removed API version (s108-old-apiversion)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s108-old-apiversion. Try the lab first.
kubectl api-resources
sed -i s#batch/v1beta1#batch/v1# $HOME/old-cron.yaml
kubectl apply -f $HOME/old-cron.yaml
