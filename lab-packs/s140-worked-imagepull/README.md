# Worked example: ImagePullBackOff (watch, then do)

**Track:** CKA, CKAD · **Level:** Beginner · **Time:** 10 min · **Namespace:** `we-image`

Two Deployments sit in `we-image`: `demo` and `mine`. Both have pods in ImagePullBackOff. Worked example: press <b>Run next step</b> in the panel and watch each command and why it is used. Then repeat the same pattern on your own workload. Your job is to fix `mine`.

## Tasks

1. **`mine` has 2 Ready pods** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. Same pattern: status, then events, then image.
2. `kubectl describe pod -n we-image -l app=mine`
3. `kubectl set image deployment/mine c=nginx:1.25 -n we-image`
</details>

<details><summary>Solution</summary>

```bash
kubectl get pods -n we-image -l app=mine
kubectl describe pod -n we-image -l app=mine
kubectl set image deployment/mine c=nginx:1.25 -n we-image
kubectl rollout status deployment/mine -n we-image
```
</details>
