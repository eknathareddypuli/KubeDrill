#!/usr/bin/env bash
# KubeDrill lab pack: Mount a ConfigMap as a file (s33-cm-volume)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s33-cm-volume. Try the lab first.
kubectl create configmap app-props --from-literal=app.properties=mode=prod -n files
kubectl delete pod web --force
kubectl apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: web
  namespace: files
  labels:
    app: web
spec:
  containers:
  - name: web
    image: nginx:1.25
    volumeMounts:
    - {name: cfg, mountPath: /etc/app}
  volumes:
  - name: cfg
    configMap:
      name: app-props
EOF
