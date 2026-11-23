#!/usr/bin/env bash
# KubeDrill lab pack: CAPSTONE (CKA): the half-built platform (s170-capstone-cka)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s170-capstone-cka. Try the lab first.
kubectl label node worker1 disk=ssd
kubectl get pods -n cap-cka
kubectl patch service web -n cap-cka -p '{"spec":{"selector":{"app":"web"}}}'
kubectl delete deployment db -n cap-cka
kubectl delete pvc data -n cap-cka
printf 'apiVersion: v1\nkind: PersistentVolumeClaim\nmetadata:\n  name: data\n  namespace: cap-cka\nspec:\n  storageClassName: standard\n  accessModes: [ReadWriteOnce]\n  resources:\n    requests:\n      storage: 1Gi\n---\napiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: db\n  namespace: cap-cka\nspec:\n  replicas: 1\n  selector:\n    matchLabels:\n      app: db\n  template:\n    metadata:\n      labels:\n        app: db\n    spec:\n      containers:\n      - name: db\n        image: nginx:1.25\n        volumeMounts:\n        - name: d\n          mountPath: /var/lib/db\n      volumes:\n      - name: d\n        persistentVolumeClaim:\n          claimName: data\n' | kubectl apply -f -
kubectl patch networkpolicy db-allow -n cap-cka --type=json -p '[{"op":"replace","path":"/spec/ingress/0/from/0/podSelector/matchLabels/app","value":"web"}]'
kubectl create role deployer-patch --verb=get,list,patch --resource=deployments -n cap-cka
kubectl create rolebinding deployer-patch --role=deployer-patch --serviceaccount=cap-cka:deployer -n cap-cka
kubectl patch cronjob backup -n cap-cka -p '{"spec":{"suspend":false,"concurrencyPolicy":"Forbid"}}'
kubectl create pdb web-pdb --selector=app=web --min-available=2 -n cap-cka
