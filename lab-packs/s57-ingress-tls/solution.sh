#!/usr/bin/env bash
# KubeDrill lab pack: Ingress with TLS termination (s57-ingress-tls)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s57-ingress-tls. Try the lab first.
kubectl create secret tls web-tls --cert=tls.crt --key=tls.key -n sec
kubectl patch ingress web -n sec -p '{"spec":{"tls":[{"hosts":["secure.local"],"secretName":"web-tls"}]}}'
kubectl describe ingress web -n sec
