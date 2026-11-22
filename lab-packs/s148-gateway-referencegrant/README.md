# Gateway API: cross-namespace backend needs a ReferenceGrant

**Track:** CKA · **Level:** Intermediate · **Time:** 12 min · **Namespace:** `web`

Team `web` routes `/api` to Service `api` that lives in namespace `data`. The HTTPRoute `api` in `web` is rejected: the backend reference does not say which namespace, and `data` has not agreed to receive traffic from `web`. Fix both, giving `data` the narrowest permission that works.

## Tasks

1. **The route names the namespace of its backend** — 
2. **`data` has a ReferenceGrant named `allow-web-routes`: HTTPRoutes from `web` to Service `api` only** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `backendRefs` accepts `namespace:`; without it the Service is looked up in the route's own namespace.
2. `kubectl patch httproute api -n web --type=json -p '[{"op":"add","path":"/spec/rules/0/backendRefs/0/namespace","value":"data"}]'`
</details>

<details><summary>Task 2 hints</summary>

1. The grant lives in the TARGET namespace (`data`).
2. `from`: group `gateway.networking.k8s.io`, kind `HTTPRoute`, namespace `web`. `to`: group `""`, kind `Service`, name `api`.
3. Naming the Service keeps the grant least-privilege.
</details>

<details><summary>Solution</summary>

```bash
kubectl patch httproute api -n web --type=json -p '[{"op":"add","path":"/spec/rules/0/backendRefs/0/namespace","value":"data"}]'
kubectl apply -f - <<'EOF'
apiVersion: gateway.networking.k8s.io/v1beta1
kind: ReferenceGrant
metadata:
  name: allow-web-routes
  namespace: data
spec:
  from:
  - group: gateway.networking.k8s.io
    kind: HTTPRoute
    namespace: web
  to:
  - group: ""
    kind: Service
    name: api
EOF
kubectl get referencegrant -n data
```
</details>
