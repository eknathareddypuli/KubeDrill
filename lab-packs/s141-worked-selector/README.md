# Worked example: Service with no endpoints (watch, then do)

**Track:** CKA, CKAD · **Level:** Beginner · **Time:** 10 min · **Namespace:** `we-svc`

In `we-svc`, Services `demo` and `mine` both have healthy pods behind them and both have no endpoints. Worked example: press <b>Run next step</b> in the panel and watch each command and why it is used. Then repeat the same pattern on your own workload. Your job is to fix `mine`.

## Tasks

1. **Service `mine` has 2 endpoints** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. Selector vs labels: `kubectl get svc mine -n we-svc -o yaml` and `--show-labels`.
2. The pods carry `app=mine`.
3. `kubectl patch svc mine -n we-svc -p '{"spec":{"selector":{"app":"mine"}}}'`
</details>

<details><summary>Solution</summary>

```bash
kubectl get svc mine -n we-svc -o jsonpath={.spec.selector}
kubectl get pods -n we-svc --show-labels
kubectl patch svc mine -n we-svc -p '{"spec":{"selector":{"app":"mine"}}}'
kubectl get endpoints mine -n we-svc
```
</details>
