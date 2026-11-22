# INCIDENT: frontend cannot reach backend (three layers)

**Track:** CKA, CKS · **Level:** Advanced · **Time:** 20 min · **Namespace:** `inc-net`

In `inc-net` the `frontend` pod must call `http://backend`. It fails. A recent hardening change restricted the frontend's egress, the backend Deployment was re-rolled with a new tag, and the Service was edited. Restore the call without removing the egress restriction (the frontend may only talk to `backend` and to DNS).

## Tasks

1. **The `backend` pods are Running and Ready** — 
2. **The Service reaches the pods (port mapping)** — 
3. **`frontend` can fetch `backend` by name** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl get pods -n inc-net` → ImagePullBackOff.
2. `kubectl set image deploy/backend backend=nginx:1.25 -n inc-net`
3. The Service has no endpoints until pods are Ready.
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl get endpoints backend -n inc-net` now lists IPs, yet a connection is refused.
2. `kubectl get svc backend -o yaml`: `targetPort: 8080`, but nginx listens on 80.
3. `kubectl patch svc backend -n inc-net --type=json -p='[{"op":"replace","path":"/spec/ports/0/targetPort","value":80}]'`
</details>

<details><summary>Task 3 hints</summary>

1. `kubectl exec frontend -n inc-net -- wget -qO- -T 2 backend` → `bad address`: DNS is blocked by the egress policy.
2. Add an egress rule to `kube-system` (namespaceSelector `kubernetes.io/metadata.name: kube-system`) on port 53 UDP and TCP.
3. Edit the existing policy or add a second one: both are additive.
</details>

<details><summary>Solution</summary>

```bash
kubectl set image deployment/backend backend=nginx:1.25 -n inc-net
kubectl patch svc backend -n inc-net --type=json -p='[{"op":"replace","path":"/spec/ports/0/targetPort","value":80}]'
kubectl apply -f - <<'EOF'
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: frontend-dns
  namespace: inc-net
spec:
  podSelector:
    matchLabels:
      role: frontend
  policyTypes: ["Egress"]
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: kube-system
    ports:
    - protocol: UDP
      port: 53
    - protocol: TCP
      port: 53
EOF
kubectl exec frontend -n inc-net -- wget -qO- -T 2 backend
```
</details>
