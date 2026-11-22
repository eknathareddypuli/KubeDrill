#!/usr/bin/env bash
# KubeDrill lab pack: ImagePullBackOff from a private registry (s55-image-pull-secret)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s55-image-pull-secret. Try the lab first.
kubectl create secret docker-registry regcred --docker-server=private.registry.io --docker-username=ci --docker-password=s3cret -n priv
kubectl patch deployment billing -n priv -p '{"spec":{"template":{"spec":{"imagePullSecrets":[{"name":"regcred"}]}}}}'
kubectl rollout status deployment/billing -n priv
