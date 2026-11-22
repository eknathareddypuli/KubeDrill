#!/usr/bin/env bash
# KubeDrill lab pack: RBAC: one ClusterRole, bound per namespace (s101-clusterrole-reuse)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s101-clusterrole-reuse. Try the lab first.
kubectl create clusterrole pod-viewer --verb=get,list,watch --resource=pods
kubectl create rolebinding ci-view --clusterrole=pod-viewer --serviceaccount=dev:ci -n dev
kubectl create rolebinding ci-view --clusterrole=pod-viewer --serviceaccount=dev:ci -n qa
kubectl auth can-i list pods -n prod --as=system:serviceaccount:dev:ci
