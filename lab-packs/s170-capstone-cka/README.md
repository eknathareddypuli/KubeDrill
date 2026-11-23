# CAPSTONE (CKA): the half-built platform

**Track:** CKA · **Level:** Advanced · **Time:** 45 min · **Namespace:** `cap-cka`

A new platform in `cap-cka` was handed over unfinished. Eight things are wrong or missing; each is worth points and partial credit counts (pass mark 66 of 100). Order is up to you.
1. `web` (3 replicas) schedules only on `disk=ssd` nodes and no node has the label;
2. all 3 `web` pods must end up Ready within the namespace quota;
3. Service `web` has no endpoints;
4. `db` is stuck: its volume claim cannot bind;
5. `db` must accept traffic only from `app=web` pods (`intruder`, app=other, must be blocked);
6. ServiceAccount `deployer` must be able to patch (not delete) deployments here;
7. CronJob `backup` is suspended and allows overlapping runs;
8. `web` needs a PodDisruptionBudget `web-pdb` keeping at least 2 pods.


## Tasks

1. **Worker node `worker1` carries the label `disk=ssd`** — 
2. **`web` has all 3 pods Ready** — 
3. **Service `web` has endpoints** — 
4. **Claim `data` is Bound and `db` is Ready** — 
5. **Only `app=web` pods can reach `db`** — 
6. **`deployer` can patch deployments in `cap-cka` but not delete them** — 
7. **CronJob `backup` runs, and forbids overlap** — 
8. **PodDisruptionBudget `web-pdb` keeps at least 2 `web` pods** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl describe pod -n cap-cka` shows why `web` is Pending.
2. `kubectl get nodes --show-labels`; label a worker, not the control plane.
</details>

<details><summary>Task 2 hints</summary>

1. After labelling, are pods created? `kubectl describe rs -n cap-cka` may mention the quota.
2. The quota allows 8 pods: count the pods already in the namespace (clients, db) before you decide.
</details>

<details><summary>Task 3 hints</summary>

1. `kubectl get endpoints web -n cap-cka` is empty: compare the Service selector with the pod labels.
</details>

<details><summary>Task 4 hints</summary>

1. `kubectl describe pvc data -n cap-cka`.
2. A claim's `storageClassName` cannot be changed: recreate it (it holds no data yet).
</details>

<details><summary>Task 5 hints</summary>

1. `db-allow` names the wrong label.
2. Test from both clients: `kubectl exec webclient -n cap-cka -- wget -qO- -T 2 db` and the same from `intruder`.
</details>

<details><summary>Task 6 hints</summary>

1. `kubectl create role` + `kubectl create rolebinding`; verify with `kubectl auth can-i ... --as=system:serviceaccount:cap-cka:deployer`.
</details>

<details><summary>Task 7 hints</summary>

1. `kubectl patch cronjob backup -n cap-cka -p ...`
</details>

<details><summary>Task 8 hints</summary>

1. `kubectl create pdb web-pdb --selector=app=web --min-available=2 -n cap-cka`
</details>

<details><summary>Solution</summary>

```bash
kubectl label node worker1 disk=ssd
kubectl get pods -n cap-cka
kubectl patch service web -n cap-cka -p '{"spec":{"selector":{"app":"web"}}}'
kubectl delete deployment db -n cap-cka
kubectl delete pvc data -n cap-cka
printf 'apiVersion: v1\nkind: PersistentVolumeClaim\nmetadata:\n  name: data\n  namespace: cap-cka\nspec:\n  storageClassName: standard\n  accessModes: [ReadWriteOnce]\n  resources:\n    requests:\n      storage: 1Gi\n---\napiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: db\n  namespace: cap-cka\nspec:\n  replicas: 1\n  selector:\n    matchLabels:\n      app: db\n  template:\n    metadata:\n      labels:\n        app: db\n    spec:\n      containers:\n      - name: db\n        image: nginx:1.25\n        volumeMounts:\n        - name: d\n          mountPath: /var/lib/db\n      volumes:\n      - name: d\n        persistentVolumeClaim:\n          claimName: data\n' | kubectl apply -f -
kubectl patch networkpolicy db-allow -n cap-cka --type=json -p '[{"op":"replace","path":"/spec/ingress/0/from/0/podSelector/matchLabels/app","value":"web"}]'
kubectl create role deployer-patch --verb=get,list,patch --resource=deployments -n cap-cka
kubectl create rolebinding deployer-patch --role=deployer-patch --serviceaccount=cap-cka:deployer -n cap-cka
kubectl patch cronjob backup -n cap-cka -p '{"spec":{"suspend":false,"concurrencyPolicy":"Forbid"}}'
kubectl create pdb web-pdb --selector=app=web --min-available=2 -n cap-cka
```
</details>
