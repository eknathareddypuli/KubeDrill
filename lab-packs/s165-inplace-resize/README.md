# Resize a running pod without restarting it

**Track:** CKA, CKAD · **Level:** Advanced · **Time:** 10 min · **Namespace:** `resize`

Pod `worker` in `resize` runs with 100m CPU and 128Mi memory (requests = limits). It is CPU-throttled. Give it 400m CPU while it keeps running: no restart, no new pod, same Guaranteed QoS class.

## Tasks

1. **The container has 400m CPU requests and limits** — 
2. **The running container actually has the new size** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl patch pod worker -n resize --subresource resize --patch ...`
2. Change requests.cpu and limits.cpu to 400m; leave memory alone.
3. Without `--subresource resize` the API server refuses the change and tells you so.
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl get pod worker -n resize -o jsonpath='{.status.containerStatuses[0].resources}'`
</details>

<details><summary>Solution</summary>

```bash
kubectl patch pod worker -n resize --subresource resize --patch '{"spec":{"containers":[{"name":"worker","resources":{"requests":{"cpu":"400m"},"limits":{"cpu":"400m"}}}]}}'
kubectl get pod worker -n resize -o jsonpath='{.status.containerStatuses[0].resources}'
```
</details>
