#!/usr/bin/env bash
# KubeDrill lab pack: Multi-container pod: log sidecar (s10-sidecar)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s10-sidecar. Try the lab first.
kubectl delete pod webapp --force
kubectl apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: webapp
  labels:
    app: webapp
spec:
  volumes:
  - name: logs
    emptyDir: {}
  containers:
  - name: webapp
    image: nginx:1.25
    volumeMounts:
    - {name: logs, mountPath: /var/log/nginx}
  - name: log-agent
    image: busybox:1.36
    command: ["sh","-c","tail -f /var/log/nginx/access.log"]
    volumeMounts:
    - {name: logs, mountPath: /var/log/nginx}
EOF
