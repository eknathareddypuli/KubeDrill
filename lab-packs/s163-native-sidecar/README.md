# Make the log shipper a native sidecar

**Track:** CKAD · **Level:** Intermediate · **Time:** 10 min · **Namespace:** `side`

Deployment `shop` in `side` runs `app` and a log shipper `shipper` as two regular containers. The shipper sometimes starts after the app has already written logs, and loses them. Run it as a native sidecar instead: it must start BEFORE `app`, keep running for the life of the pod, and be restarted if it exits.

## Tasks

1. **`shipper` is an init container with `restartPolicy: Always`** — 
2. **Only `app` is left in `containers` and both pods are Ready** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl explain pod.spec.initContainers.restartPolicy`
2. Remove `shipper` from `containers` and add it to `initContainers` with `restartPolicy: Always`.
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl get pods -n side` shows 1/1 because native sidecars are not counted in the READY column of regular containers in all versions; check with describe.
</details>

<details><summary>Solution</summary>

```bash
kubectl patch deployment shop -n side --type=json -p '[{"op":"remove","path":"/spec/template/spec/containers/1"},{"op":"add","path":"/spec/template/spec/initContainers","value":[{"name":"shipper","image":"busybox:1.36","command":["sh","-c","sleep 3600"],"restartPolicy":"Always"}]}]'
kubectl rollout status deployment/shop -n side
```
</details>
