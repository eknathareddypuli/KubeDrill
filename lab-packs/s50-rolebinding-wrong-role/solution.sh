#!/usr/bin/env bash
# KubeDrill lab pack: RoleBinding points at the wrong Role (s50-rolebinding-wrong-role)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s50-rolebinding-wrong-role. Try the lab first.
kubectl delete rolebinding dev-bind -n team
kubectl create rolebinding dev-bind --role=editor --serviceaccount=team:dev -n team
kubectl auth can-i create deployments --as=system:serviceaccount:team:dev -n team
