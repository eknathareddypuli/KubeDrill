#!/usr/bin/env bash
# KubeDrill lab pack: The default ServiceAccount is cluster-admin (s78-default-sa-admin)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s78-default-sa-admin. Try the lab first.
kubectl delete clusterrolebinding default-sa-admin
kubectl create sa dash-reader -n apps
kubectl create role pod-reader --verb=get,list,watch --resource=pods -n apps
kubectl create rolebinding dash-reader --role=pod-reader --serviceaccount=apps:dash-reader -n apps
kubectl patch deploy dash -n apps --type=json -p '[{"op":"add","path":"/spec/template/spec/serviceAccountName","value":"dash-reader"}]'
kubectl get pods -n apps
