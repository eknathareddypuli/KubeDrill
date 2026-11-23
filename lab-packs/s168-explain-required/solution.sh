#!/usr/bin/env bash
# KubeDrill lab pack: Documentation lookup: what is required, and what is allowed (s168-explain-required)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s168-explain-required. Try the lab first.
kubectl explain pod.spec.topologySpreadConstraints
printf 'a=maxSkew,topologyKey,whenUnsatisfiable\nb=DoNotSchedule,ScheduleAnyway\nc=Fail,Ignore\nd=allowVolumeExpansion\n' > $HOME/lookup.txt
