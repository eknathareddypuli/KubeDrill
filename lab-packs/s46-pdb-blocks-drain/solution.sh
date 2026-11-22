#!/usr/bin/env bash
# KubeDrill lab pack: PodDisruptionBudget blocks a node drain (s46-pdb-blocks-drain)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s46-pdb-blocks-drain. Try the lab first.
kubectl patch pdb guard -n maint -p '{"spec":{"minAvailable":2}}'
kubectl drain worker1 --ignore-daemonsets --delete-emptydir-data
kubectl get pods -n maint -o wide
