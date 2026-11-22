#!/usr/bin/env bash
# KubeDrill lab pack: ClusterRole: let a ServiceAccount list nodes (s49-clusterrole-nodes)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s49-clusterrole-nodes. Try the lab first.
kubectl create clusterrole node-reader --verb=get,list --resource=nodes
kubectl create clusterrolebinding monitor-nodes --clusterrole=node-reader --serviceaccount=obs:monitor
kubectl auth can-i list nodes --as=system:serviceaccount:obs:monitor
