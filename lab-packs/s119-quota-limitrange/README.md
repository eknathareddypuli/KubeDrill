# Quota and LimitRange: who spent the CPU?

**Track:** CKA · **Level:** Intermediate · **Time:** 12 min · **Namespace:** `team-b`

The `web` Deployment in `team-b` wants 4 replicas but only 2 run. Its containers declare **no** resources. The namespace has a ResourceQuota (`requests.cpu: 1`) and a LimitRange. Find out why the quota is used up so fast and fix it at the source, without raising the quota.

## Tasks

1. **Lower the LimitRange default request to `100m`** — 
2. **All 4 `web` replicas are Ready without quota errors** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl describe rs -n team-b`: "exceeded quota ... requested: requests.cpu=400m".
2. `kubectl describe limitrange defaults` shows where 400m comes from.
3. `kubectl patch limitrange defaults -n team-b --type=json -p '[{"op":"replace","path":"/spec/limits/0/defaultRequest/cpu","value":"100m"}]'`
</details>

<details><summary>Task 2 hints</summary>

1. New pods get the new default; existing pods keep the old one.
2. `kubectl rollout restart deploy/web -n team-b` makes every pod pick it up.
3. `kubectl describe quota -n team-b`
</details>

<details><summary>Solution</summary>

```bash
kubectl describe quota -n team-b
kubectl patch limitrange defaults -n team-b --type=json -p '[{"op":"replace","path":"/spec/limits/0/defaultRequest/cpu","value":"100m"}]'
kubectl rollout restart deployment/web -n team-b
kubectl rollout status deployment/web -n team-b
```
</details>
