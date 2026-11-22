# YAML repair: removed apiVersion

**Track:** CKA, CKAD · **Level:** Beginner · **Time:** 10 min · **Namespace:** `yr-api`

An old blog post gave you `/home/student/legacy.yaml`. On a current cluster the Deployment is refused with "no matches for kind". Fix the file and deploy `legacy` (2 replicas) in `yr-api`.

## Tasks

1. **Manifest uses `apps/v1` and Deployment `legacy` is Ready** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl api-resources | grep deployments` shows `apps/v1`.
2. `sed -i s#apps/v1beta1#apps/v1# /home/student/legacy.yaml`
3. Apply the file again.
</details>

<details><summary>Solution</summary>

```bash
sed -i s#apps/v1beta1#apps/v1# /home/student/legacy.yaml
kubectl apply -f /home/student/legacy.yaml
```
</details>
