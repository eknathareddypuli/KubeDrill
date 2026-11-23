# Debug a shell-less pod with an ephemeral container

**Track:** CKA, CKAD · **Level:** Intermediate · **Time:** 8 min · **Namespace:** `dbg`

Pod `api` in `dbg` runs a minimal image with no shell, so `kubectl exec` is useless and nobody may restart it: a customer session is attached. Attach a temporary debug container named `inspector` (image `busybox:1.36`) that shares the process namespace of container `api`, without changing or restarting the pod.

## Tasks

1. **Ephemeral container `inspector` exists on `api`** — 
2. **The original pod is still Running and was not restarted** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl debug -n dbg api -it --image=busybox:1.36 --target=api -c inspector`
2. The flags that matter: `--image`, `--target` (which container's processes you want to see) and `-c` (the name).
3. `kubectl explain pod.spec.ephemeralContainers.targetContainerName`
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl get pod api -n dbg` should show RESTARTS 0.
2. Adding an ephemeral container never restarts the others.
</details>

<details><summary>Solution</summary>

```bash
kubectl debug -n dbg api -it --image=busybox:1.36 --target=api -c inspector
kubectl get pod api -n dbg -o jsonpath='{.spec.ephemeralContainers[*].name}'
```
</details>
