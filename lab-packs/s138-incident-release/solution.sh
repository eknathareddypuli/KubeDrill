#!/usr/bin/env bash
# KubeDrill lab pack: INCIDENT: release 42 broke `api` and `worker` (s138-incident-release)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s138-incident-release. Try the lab first.
kubectl get pods -n inc-api
kubectl patch deploy api -n inc-api --type=json -p='[{"op":"replace","path":"/spec/template/spec/containers/0/env/0/valueFrom/secretKeyRef/key","value":"password"},{"op":"replace","path":"/spec/template/spec/containers/0/readinessProbe/httpGet/port","value":80}]'
kubectl set resources deployment worker -n inc-api --limits=memory=160Mi
kubectl rollout status deployment/api -n inc-api
