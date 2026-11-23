#!/usr/bin/env bash
# KubeDrill lab pack: CAPSTONE (CKAD): ship the orders service (s171-capstone-ckad)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s171-capstone-ckad. Try the lab first.
kubectl patch deployment orders -n cap-ckad --type=json -p '[{"op":"replace","path":"/spec/template/spec/containers/0/image","value":"nginx:1.25"},{"op":"replace","path":"/spec/template/spec/containers/0/env/1/valueFrom/secretKeyRef/key","value":"password"},{"op":"replace","path":"/spec/template/spec/containers/0/readinessProbe/httpGet/port","value":80}]'
kubectl patch configmap orders-cfg -n cap-ckad -p '{"data":{"LOG_LEVEL":"info"}}'
kubectl patch service orders -n cap-ckad -p '{"spec":{"ports":[{"port":80,"targetPort":80}]}}'
kubectl delete job migrate -n cap-ckad
kubectl create job migrate --image=busybox:1.36 -n cap-ckad -- sh -c "echo migrated"
kubectl patch cronjob report -n cap-ckad -p '{"spec":{"schedule":"0 * * * *","concurrencyPolicy":"Forbid"}}'
kubectl autoscale deployment orders --min=2 --max=5 --cpu-percent=70 -n cap-ckad
kubectl create ingress orders --rule="orders.example.com/*=orders:80" -n cap-ckad
