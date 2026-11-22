#!/usr/bin/env bash
# KubeDrill lab pack: YAML repair: removed apiVersion (s145-yaml-apiversion)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s145-yaml-apiversion. Try the lab first.
sed -i s#apps/v1beta1#apps/v1# $HOME/legacy.yaml
kubectl apply -f $HOME/legacy.yaml
