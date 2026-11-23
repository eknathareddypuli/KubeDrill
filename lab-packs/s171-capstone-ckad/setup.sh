#!/usr/bin/env bash
# KubeDrill lab pack: CAPSTONE (CKAD): ship the orders service (s171-capstone-ckad)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: CAPSTONE (CKAD): ship the orders service"
kubectl create namespace cap-ckad --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: cap-ckad

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: ConfigMap
metadata:
  name: orders-cfg
  namespace: cap-ckad
data:
  PORT: "8080"
  MODE: prod

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Secret
metadata:
  name: orders-db
  namespace: cap-ckad
stringData:
  password: s3cret

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: orders
  namespace: cap-ckad
spec:
  replicas: 2
  selector:
    matchLabels:
      app: orders
  template:
    metadata:
      labels:
        app: orders
    spec:
      containers:
      - name: orders
        image: nginx:1.25-nope
        resources:
          requests:
            cpu: 50m
            memory: 32Mi
        env:
        - name: LOG_LEVEL
          valueFrom:
            configMapKeyRef:
              name: orders-cfg
              key: LOG_LEVEL
        - name: DB_PASS
          valueFrom:
            secretKeyRef:
              name: orders-db
              key: db-password
        readinessProbe:
          httpGet:
            path: /
            port: 8081

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Service
metadata:
  name: orders
  namespace: cap-ckad
spec:
  selector:
    app: orders
  ports:
  - port: 80
    targetPort: 8080

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Pod
metadata:
  name: tester
  namespace: cap-ckad
  labels:
    app: tester
spec:
  containers:
  - name: c
    image: busybox:1.36
    command: ["sleep", "3600"]

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: batch/v1
kind: Job
metadata:
  name: migrate
  namespace: cap-ckad
spec:
  backoffLimit: 1
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: m
        image: busybox:1.36
        command: ["sh", "-c", "echo migration failed: lock timeout; exit 1"]

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: batch/v1
kind: CronJob
metadata:
  name: report
  namespace: cap-ckad
spec:
  schedule: "*/1 * * * *"
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: r
            image: busybox:1.36
            command: ["sh", "-c", "echo report"]

KUBEDRILL_EOF


kubectl config set-context --current --namespace=cap-ckad >/dev/null
echo "✔ Ready. Namespace: cap-ckad. Read README.md, fix the cluster, then run ./check.sh"
