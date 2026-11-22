# A failing Job: stop the retries, fix, and tidy up

**Track:** CKAD · **Level:** Intermediate · **Time:** 10 min · **Namespace:** `batchq`

Job `export` runs a command that exits with code 1, so Kubernetes keeps creating failed pods. Replace it with a Job that works (`echo exporting`), **gives up quickly** (`backoffLimit: 1`, `activeDeadlineSeconds: 120`) and **cleans itself up** (`ttlSecondsAfterFinished: 600`).

## Tasks

1. **Recreate `export` so the Job completes** — 
2. **Give up after one retry and within 120 seconds** — 
3. **Clean up automatically after 10 minutes** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl get job export -n batchq` shows it Failed after retries.
2. Pod templates are immutable: delete the Job, then apply a new one.
3. Command: `["sh","-c","echo exporting"]`.
</details>

<details><summary>Task 2 hints</summary>

1. `spec.backoffLimit: 1`
2. `spec.activeDeadlineSeconds: 120`
3. Both are fields of the Job spec, not of the pod template.
</details>

<details><summary>Task 3 hints</summary>

1. `spec.ttlSecondsAfterFinished: 600`
2. The TTL controller deletes the Job and its pods once it expires.
3. Without it, finished Jobs pile up forever.
</details>

<details><summary>Solution</summary>

```bash
kubectl get job export -n batchq
kubectl delete job export -n batchq
kubectl apply -f - <<'EOF'
apiVersion: batch/v1
kind: Job
metadata:
  name: export
  namespace: batchq
spec:
  backoffLimit: 1
  activeDeadlineSeconds: 120
  ttlSecondsAfterFinished: 600
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: export
        image: busybox:1.36
        command: ["sh", "-c", "echo exporting"]
EOF
kubectl get job export -n batchq
```
</details>
