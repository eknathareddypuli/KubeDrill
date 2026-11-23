# Grow a bound PVC without losing data

**Track:** CKA · **Level:** Intermediate · **Time:** 10 min · **Namespace:** `data`

Pod `db` in `data` stores its files on PVC `db-data` (1Gi, StorageClass `slow`) and the disk is full. Make the claim 3Gi while the pod keeps running. The claim holds real data: do not delete or recreate it.

## Tasks

1. **The StorageClass allows expansion** — 
2. **The claim is 3Gi and the pod still runs** — 
3. **Shrinking is refused** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. The first resize attempt fails and says why.
2. `kubectl patch sc slow -p '{"allowVolumeExpansion":true}'`
3. Allowing expansion affects every claim of this class: it is a one-way, low-risk switch, but say so in a change note.
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl patch pvc db-data -n data -p '{"spec":{"resources":{"requests":{"storage":"3Gi"}}}}'`
2. `kubectl get pvc -n data` CAPACITY updates once the controller finishes.
</details>

<details><summary>Task 3 hints</summary>

1. A volume can never be made smaller. (This task passes by itself once task 2 is done and the claim is still 3Gi.)
</details>

<details><summary>Solution</summary>

```bash
kubectl patch pvc db-data -n data -p '{"spec":{"resources":{"requests":{"storage":"3Gi"}}}}'
kubectl patch sc slow -p '{"allowVolumeExpansion":true}'
kubectl patch pvc db-data -n data -p '{"spec":{"resources":{"requests":{"storage":"3Gi"}}}}'
kubectl get pvc -n data
```
</details>
