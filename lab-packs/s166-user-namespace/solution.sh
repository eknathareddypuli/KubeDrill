#!/usr/bin/env bash
# KubeDrill lab pack: Map root in the container to a harmless host user (s166-user-namespace)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s166-user-namespace. Try the lab first.
kubectl patch deployment legacy -n userns -p '{"spec":{"template":{"spec":{"hostUsers":false}}}}'
kubectl rollout status deployment/legacy -n userns
