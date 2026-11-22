#!/usr/bin/env bash
# KubeDrill lab pack: A developer laptop was stolen: remove what the certificate can do (s132-leaked-cert)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s132-leaked-cert. Try the lab first.
kubectl delete rolebinding rb-bob -n sales
kubectl delete clusterrolebinding crb-bob
kubectl delete rolebinding rb-contractors -n finance
kubectl create rolebinding rb-carol --role=pod-reader --user=carol -n finance
kubectl auth can-i list pods -n finance --as bob --as-group contractors
