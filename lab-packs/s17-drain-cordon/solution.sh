#!/usr/bin/env bash
# KubeDrill lab pack: Node maintenance: cordon and drain (s17-drain-cordon)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s17-drain-cordon. Try the lab first.
kubectl drain worker1 --ignore-daemonsets --delete-emptydir-data
kubectl get pods -o wide
