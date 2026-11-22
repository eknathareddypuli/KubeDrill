#!/usr/bin/env bash
# KubeDrill lab pack: Drain a node that holds a bare pod (s98-drain-bare-pod)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s98-drain-bare-pod. Try the lab first.
kubectl drain worker1 --ignore-daemonsets --delete-emptydir-data --force
kubectl get pods -n ops -o wide
kubectl uncordon worker1
