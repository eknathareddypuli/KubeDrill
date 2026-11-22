# StatefulSet scale-down: what happens to the volumes?

**Track:** CKA · **Level:** Intermediate · **Time:** 12 min · **Namespace:** `ledger`

The `db` StatefulSet runs 3 replicas, each with its own volume. Capacity planning says 2 is enough. Scale down to 2, keep the data of `db-0` and `db-1` untouched, and release the storage of the retired replica `db-2`.

## Tasks

1. **Scale `db` down to 2 replicas** — 
2. **Release the storage of the retired replica** — 
3. **`db-1` is still bound to its original volume** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl scale sts db --replicas=2`
2. Pods stop in reverse order: `db-2` goes first.
3. `kubectl get pods -w`
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl get pvc`: is `data-db-2` still there after the scale-down?
2. Yes: claims are kept so a later scale-up reattaches the old data.
3. `kubectl delete pvc data-db-2`
</details>

<details><summary>Task 3 hints</summary>

1. `kubectl get pvc data-db-1`
2. STATUS must be Bound.
3. Never delete a claim to "tidy up" while a pod uses it.
</details>

<details><summary>Solution</summary>

```bash
kubectl scale sts db --replicas=2
kubectl get pvc
kubectl delete pvc data-db-2
kubectl get pods,pvc
```
</details>
