#!/usr/bin/env bash
# KubeDrill lab pack: Make the log shipper a native sidecar (s163-native-sidecar)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s163-native-sidecar. Try the lab first.
kubectl patch deployment shop -n side --type=json -p '[{"op":"remove","path":"/spec/template/spec/containers/1"},{"op":"add","path":"/spec/template/spec/initContainers","value":[{"name":"shipper","image":"busybox:1.36","command":["sh","-c","sleep 3600"],"restartPolicy":"Always"}]}]'
kubectl rollout status deployment/shop -n side
