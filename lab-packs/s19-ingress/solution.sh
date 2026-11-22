#!/usr/bin/env bash
# KubeDrill lab pack: Ingress: host + path routing (s19-ingress)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s19-ingress. Try the lab first.
kubectl create ingress shop --class=nginx --rule="shop.local/=web:80" --rule="shop.local/api=api:80" -n shop
kubectl get ingress -n shop
