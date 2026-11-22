#!/usr/bin/env bash
# KubeDrill lab pack: RBAC: least-privilege deployer (s11-rbac-sa)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s11-rbac-sa. Try the lab first.
kubectl create role deploy-manager --verb=get,list,create,update --resource=deployments -n ci
kubectl create rolebinding deployer-binding --role=deploy-manager --serviceaccount=ci:deployer -n ci
kubectl auth can-i delete deployments --as=system:serviceaccount:ci:deployer -n ci
