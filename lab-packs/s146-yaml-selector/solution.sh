#!/usr/bin/env bash
# KubeDrill lab pack: YAML repair: selector that matches nothing (s146-yaml-selector)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s146-yaml-selector. Try the lab first.
sed -i s/app:\ web/app:\ site/ $HOME/site.yaml
kubectl apply -f $HOME/site.yaml
