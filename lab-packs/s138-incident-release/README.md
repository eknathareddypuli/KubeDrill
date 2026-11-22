# INCIDENT: release 42 broke `api` and `worker`

**Track:** CKAD · **Level:** Advanced · **Time:** 20 min · **Namespace:** `inc-api`

Release 42 shipped two workloads in `inc-api`: `api` (web, 2 replicas) and `worker` (batch processor). Both are unhealthy, for different reasons, and `api` has more than one problem. Get both Ready. Keep the readiness probe and the memory limit: tune them, do not delete them.

## Tasks

1. **`api`: pods start (no CreateContainerConfigError)** — 
2. **`api`: both pods Ready (the readiness probe checks the right port)** — 
3. **`worker`: stops being OOMKilled and runs steadily** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl describe pod -n inc-api -l app=api` → `couldn't find key ... in Secret`.
2. `kubectl get secret api-secret -n inc-api -o jsonpath="{.data}"` lists the real keys.
3. Point the env var at the key that exists (`password`).
</details>

<details><summary>Task 2 hints</summary>

1. After the env fix the pods are Running but `0/1` Ready.
2. `kubectl describe pod` → `Readiness probe failed ... connection refused`: nginx listens on 80.
3. `kubectl patch deploy api -n inc-api --type=json -p='[{"op":"replace","path":"/spec/template/spec/containers/0/readinessProbe/httpGet/port","value":80}]'`
</details>

<details><summary>Task 3 hints</summary>

1. `kubectl describe pod -n inc-api -l app=worker` → `OOMKilled`, exit code 137.
2. It allocates 120M, the limit is 80Mi: raise the limit above real usage (about 160Mi), keep a limit.
3. `kubectl set resources deploy worker -n inc-api --limits=memory=160Mi`
</details>

<details><summary>Solution</summary>

```bash
kubectl get pods -n inc-api
kubectl patch deploy api -n inc-api --type=json -p='[{"op":"replace","path":"/spec/template/spec/containers/0/env/0/valueFrom/secretKeyRef/key","value":"password"},{"op":"replace","path":"/spec/template/spec/containers/0/readinessProbe/httpGet/port","value":80}]'
kubectl set resources deployment worker -n inc-api --limits=memory=160Mi
kubectl rollout status deployment/api -n inc-api
```
</details>
