# CRD: the custom resource is rejected by its schema

**Track:** CKA, CKAD · **Level:** Intermediate · **Time:** 12 min · **Namespace:** `ops`

CRD `backups.stable.example.com` is installed. `/home/student/nightly.yaml` should create Backup `nightly` in `ops` but the API server refuses it. Read the errors and fix the **resource file**, not the CRD: the schedule is `0 2 * * *`, keep 7 copies, tier `pro`.

## Tasks

1. **Backup `nightly` exists with `schedule: 0 2 * * *`** — 
2. **It keeps 7 copies on the `pro` tier** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl apply -f /home/student/nightly.yaml` and read ALL the errors, there are three.
2. `schedule` is required; `keep` has a minimum of 1; `tier` is an enum (free, pro).
3. Fix the file, then apply it.
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl explain backup.spec` lists keep and tier.
2. keep: 7 (integer, not a string). tier: pro.
</details>

<details><summary>Solution</summary>

```bash
cat > /home/student/nightly.yaml <<'EOF'
apiVersion: stable.example.com/v1
kind: Backup
metadata:
  name: nightly
  namespace: ops
spec:
  schedule: "0 2 * * *"
  keep: 7
  tier: pro
EOF
kubectl apply -f /home/student/nightly.yaml
```
</details>
