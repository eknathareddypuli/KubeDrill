#!/usr/bin/env bash
# KubeDrill lab pack: Expose a Service on a fixed NodePort (s58-nodeport-fixed)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s58-nodeport-fixed. Try the lab first.
kubectl patch svc site -n np -p '{"spec":{"type":"NodePort","ports":[{"port":80,"targetPort":80,"nodePort":30080}]}}'
kubectl get svc site -n np
