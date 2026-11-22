#!/usr/bin/env bash
# KubeDrill lab pack: High availability: PDB + topology spread (s20-pdb-spread)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s20-pdb-spread. Try the lab first.
kubectl create pdb checkout-pdb --selector=app=checkout --min-available=2 -n ha
kubectl patch deployment checkout -n ha -p '{"spec":{"template":{"spec":{"topologySpreadConstraints":[{"maxSkew":1,"topologyKey":"kubernetes.io/hostname","whenUnsatisfiable":"DoNotSchedule","labelSelector":{"matchLabels":{"app":"checkout"}}}]}}}}'
kubectl rollout status deployment/checkout -n ha
