#!/usr/bin/env bash
# KubeDrill lab pack: Review a manifest: fix six production anti-patterns (s128-manifest-review)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s128-manifest-review. Try the lab first.
kubectl apply -f - <<'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: orders-web
  namespace: review
spec:
  replicas: 2
  selector:
    matchLabels:
      app: orders-web
  template:
    metadata:
      labels:
        app: orders-web
    spec:
      containers:
      - name: web
        image: nginxinc/nginx-unprivileged:1.25
        resources:
          requests:
            cpu: 100m
            memory: 64Mi
          limits:
            memory: 128Mi
        readinessProbe:
          httpGet:
            path: /
            port: 8080
        securityContext:
          runAsNonRoot: true
          runAsUser: 101
          allowPrivilegeEscalation: false
        env:
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: orders-db
              key: password
EOF
kubectl rollout status deployment/orders-web -n review
