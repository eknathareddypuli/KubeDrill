# NetworkPolicy: ipBlock and a port range

**Track:** CKS, CKA · **Level:** Advanced · **Time:** 15 min · **Namespace:** `ranges`

Everything in `ranges` is default-denied for ingress. `api` has three small web servers on ports 8080, 8081 and 8090 (Services `api-8080`, `api-8081`, `api-8090`), and client `tester` must reach 8080 and 8081 only. Allow ingress to `api` pods from the pod network `10.244.0.0/16` on the port RANGE 8080–8081 using `endPort`: one rule, not two.

## Tasks

1. **`tester` reaches ports 8080 and 8081** — 
2. **Port 8090 stays blocked** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl explain networkpolicy.spec.ingress.ports`
2. ports: [{port: 8080, endPort: 8081, protocol: TCP}]; from: [{ipBlock: {cidr: 10.244.0.0/16}}]
</details>

<details><summary>Task 2 hints</summary>

1. The range ends at 8081.
</details>

<details><summary>Solution</summary>

```bash
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-range
  namespace: ranges
spec:
  podSelector:
    matchLabels:
      app: api
  policyTypes: ["Ingress"]
  ingress:
  - from:
    - ipBlock:
        cidr: 10.244.0.0/16
    ports:
    - protocol: TCP
      port: 8080
      endPort: 8081
EOF
```
</details>
