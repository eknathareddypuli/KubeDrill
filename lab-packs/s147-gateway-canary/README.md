# Gateway API: header routing and a 90/10 split

**Track:** CKA · **Level:** Intermediate · **Time:** 12 min · **Namespace:** `gw3`

HTTPRoute `shop` in `gw3` sends everything to Service `shop-v1`. Release `shop-v2` is ready. Product wants: requests carrying the header `x-canary: true` always go to v2; everybody else is split 90% v1 and 10% v2. The Gateway `public` is shared with other teams.

## Tasks

1. **Requests with header `x-canary: true` go to `shop-v2`** — 
2. **All other traffic is split 90 to `shop-v1`, 10 to `shop-v2`** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. A rule needs `matches: - headers: - name: x-canary value: "true"`.
2. Put the header rule FIRST in `spec.rules`, with `backendRefs` pointing at `shop-v2` port 80.
3. `kubectl explain httproute.spec.rules.matches.headers` lists the fields.
</details>

<details><summary>Task 2 hints</summary>

1. The second rule has two `backendRefs`, each with a `weight`.
2. weights are relative: 90 and 10.
3. Apply the whole HTTPRoute again with `kubectl apply -f -` (the list of rules is replaced, not merged).
</details>

<details><summary>Solution</summary>

```bash
kubectl apply -f - <<'EOF'
apiVersion: gateway.networking.k8s.io/v1
kind: HTTPRoute
metadata:
  name: shop
  namespace: gw3
spec:
  parentRefs:
  - name: public
  hostnames: ["shop.local"]
  rules:
  - matches:
    - headers:
      - name: x-canary
        value: "true"
    backendRefs:
    - name: shop-v2
      port: 80
  - backendRefs:
    - name: shop-v1
      port: 80
      weight: 90
    - name: shop-v2
      port: 80
      weight: 10
EOF
kubectl get httproute shop -n gw3 -o yaml
```
</details>
