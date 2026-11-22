#!/usr/bin/env bash
# KubeDrill lab pack: Stop leaking secrets through env vars (s111-secret-volume)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s111-secret-volume. Try the lab first.
kubectl patch deployment billing -n vault --type=json -p '[{"op":"remove","path":"/spec/template/spec/containers/0/env"},{"op":"add","path":"/spec/template/spec/volumes","value":[{"name":"db","secret":{"secretName":"db-pass","defaultMode":256}}]},{"op":"add","path":"/spec/template/spec/containers/0/volumeMounts","value":[{"name":"db","mountPath":"/etc/db","readOnly":true}]}]'
kubectl rollout status deployment/billing -n vault
