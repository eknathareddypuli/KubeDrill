#!/usr/bin/env bash
# KubeDrill lab pack: Pod-count quota blocks scaling (s48-quota-pods)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s48-quota-pods. Try the lab first.
kubectl patch resourcequota count -n qt -p '{"spec":{"hard":{"pods":"6"}}}'
kubectl get pods -n qt
