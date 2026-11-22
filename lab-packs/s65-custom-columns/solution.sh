#!/usr/bin/env bash
# KubeDrill lab pack: custom-columns and --sort-by (s65-custom-columns)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s65-custom-columns. Try the lab first.
kubectl get pods -n cc -o custom-columns=NAME:.metadata.name,NODE:.spec.nodeName > pods.txt
kubectl get pods -n cc --sort-by=.metadata.creationTimestamp -o name > sorted.txt
cat pods.txt
