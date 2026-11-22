#!/usr/bin/env bash
# KubeDrill lab pack: Change config without a restart: volume vs env (s121-config-reload)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s121-config-reload. Try the lab first.
kubectl patch deployment web -n reload --type=json -p '[{"op":"remove","path":"/spec/template/spec/containers/0/env"},{"op":"add","path":"/spec/template/spec/volumes","value":[{"name":"flags","configMap":{"name":"flags"}}]},{"op":"add","path":"/spec/template/spec/containers/0/volumeMounts","value":[{"name":"flags","mountPath":"/etc/flags"}]}]'
kubectl rollout status deployment/web -n reload
kubectl patch configmap flags -n reload -p '{"data":{"FEATURE":"on"}}'
kubectl exec deploy/web -n reload -- cat /etc/flags/FEATURE
