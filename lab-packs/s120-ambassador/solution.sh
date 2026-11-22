#!/usr/bin/env bash
# KubeDrill lab pack: Ambassador pattern: talk to localhost, let a proxy do the rest (s120-ambassador)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s120-ambassador. Try the lab first.
kubectl patch deployment api -n ambassador --type=json -p '[{"op":"add","path":"/spec/template/spec/containers/-","value":{"name":"ambassador","image":"nginx:1.25","env":[{"name":"UPSTREAM","value":"db-prod:5432"}],"ports":[{"containerPort":5432}]}},{"op":"replace","path":"/spec/template/spec/containers/0/env/0/value","value":"localhost"}]'
kubectl rollout status deployment/api -n ambassador
kubectl get pods -n ambassador
