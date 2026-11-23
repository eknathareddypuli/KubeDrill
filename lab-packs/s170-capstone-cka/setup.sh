#!/usr/bin/env bash
# KubeDrill lab pack: CAPSTONE (CKA): the half-built platform (s170-capstone-cka)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
echo "▶ Setting up lab: CAPSTONE (CKA): the half-built platform"
kubectl create namespace cap-cka --dry-run=client -o yaml | kubectl apply -f -
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Namespace
metadata:
  name: cap-cka

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: ResourceQuota
metadata:
  name: pods-cap
  namespace: cap-cka
spec:
  hard:
    pods: "8"
    count/deployments.apps: "5"

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  namespace: cap-cka
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      nodeSelector:
        disk: ssd
      containers:
      - name: web
        image: nginx:1.25

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Service
metadata:
  name: web
  namespace: cap-cka
spec:
  selector:
    app: webb
  ports:
  - port: 80
    targetPort: 80

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: data
  namespace: cap-cka
spec:
  storageClassName: fast
  accessModes: [ReadWriteOnce]
  resources:
    requests:
      storage: 1Gi

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: db
  namespace: cap-cka
spec:
  replicas: 1
  selector:
    matchLabels:
      app: db
  template:
    metadata:
      labels:
        app: db
    spec:
      containers:
      - name: db
        image: nginx:1.25
        volumeMounts:
        - name: d
          mountPath: /var/lib/db
      volumes:
      - name: d
        persistentVolumeClaim:
          claimName: data

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Service
metadata:
  name: db
  namespace: cap-cka
spec:
  selector:
    app: db
  ports:
  - port: 80
    targetPort: 80

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
  namespace: cap-cka
spec:
  podSelector: {}
  policyTypes: ["Ingress"]

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: db-allow
  namespace: cap-cka
spec:
  podSelector:
    matchLabels:
      app: db
  policyTypes: ["Ingress"]
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: frontend

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Pod
metadata:
  name: webclient
  namespace: cap-cka
  labels:
    app: web
spec:
  containers:
  - name: c
    image: busybox:1.36
    command: ["sleep", "3600"]

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: Pod
metadata:
  name: intruder
  namespace: cap-cka
  labels:
    app: other
spec:
  containers:
  - name: c
    image: busybox:1.36
    command: ["sleep", "3600"]

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: v1
kind: ServiceAccount
metadata:
  name: deployer
  namespace: cap-cka

KUBEDRILL_EOF
kubectl apply -f - <<'KUBEDRILL_EOF'
apiVersion: batch/v1
kind: CronJob
metadata:
  name: backup
  namespace: cap-cka
spec:
  schedule: "0 2 * * *"
  suspend: true
  concurrencyPolicy: Allow
  jobTemplate:
    spec:
      template:
        spec:
          restartPolicy: OnFailure
          containers:
          - name: b
            image: busybox:1.36
            command: ["sh", "-c", "echo backup"]

KUBEDRILL_EOF


kubectl config set-context --current --namespace=cap-cka >/dev/null
echo "✔ Ready. Namespace: cap-cka. Read README.md, fix the cluster, then run ./check.sh"
