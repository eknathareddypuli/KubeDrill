#!/usr/bin/env bash
# KubeDrill lab pack: Version skew: which components are out of policy? (s155-version-skew)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s155-version-skew. Try the lab first.
printf 'kube-scheduler\nkubelet-worker3\nkubelet-worker4\n' > $HOME/violations.txt
