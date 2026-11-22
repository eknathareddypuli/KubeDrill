# Worked example: missing ConfigMap (watch, then do)

**Track:** CKAD · **Level:** Beginner · **Time:** 10 min · **Namespace:** `we-cfg`

Deployments `demo` and `mine` in `we-cfg` read the env var `MODE` from a ConfigMap that does not exist, so no pod starts. Worked example: press <b>Run next step</b> in the panel and watch each command and why it is used. Then repeat the same pattern on your own workload. Your job is to fix `mine`.

## Tasks

1. **`mine` pods are Ready** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. Same pattern: describe the pod and read which ConfigMap is missing.
2. The Deployment expects ConfigMap `mine-cfg` with key `mode`.
3. `kubectl create configmap mine-cfg --from-literal=mode=live -n we-cfg`
</details>

<details><summary>Solution</summary>

```bash
kubectl describe pod -n we-cfg -l app=mine
kubectl create configmap mine-cfg --from-literal=mode=live -n we-cfg
kubectl get pods -n we-cfg -l app=mine
```
</details>
