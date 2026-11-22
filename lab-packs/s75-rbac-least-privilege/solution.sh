#!/usr/bin/env bash
# KubeDrill lab pack: Cut a wildcard Role down to least privilege (s75-rbac-least-privilege)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s75-rbac-least-privilege. Try the lab first.
kubectl auth can-i get secrets --as=system:serviceaccount:ci:deployer -n ci
kubectl delete role deployer -n ci
kubectl create role deployer --verb=get,list,watch,create,update,patch --resource=deployments.apps -n ci
kubectl auth can-i delete deployments --as=system:serviceaccount:ci:deployer -n ci
