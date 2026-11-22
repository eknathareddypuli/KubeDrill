# Zero-downtime rollout: surge, readiness, preStop, PDB

**Track:** CKA, CKAD · **Level:** Advanced · **Time:** 15 min · **Namespace:** `checkout-z`

Every release of `checkout` drops a few requests. The defaults let one pod be unavailable, pods count as Ready the moment they start, and a terminating pod can be killed while it still serves requests. Make rollouts lossless: `maxUnavailable: 0`, a readiness probe, a `preStop` sleep of 10 s with a 45 s grace period, and a PodDisruptionBudget keeping 2 pods up.

## Tasks

1. **Never remove capacity during a rollout** — 
2. **Only count a pod as ready when it answers** — 
3. **Drain gracefully: `preStop` sleep 10 and a 45 s grace period** — 
4. **Protect against voluntary disruptions with a PodDisruptionBudget** — 
5. **The rollout completes with 3 Ready pods** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `spec.strategy.rollingUpdate.maxUnavailable: 0` and `maxSurge: 1`
2. `kubectl patch deploy checkout -n checkout-z -p '{"spec":{"strategy":{"type":"RollingUpdate","rollingUpdate":{"maxUnavailable":0,"maxSurge":1}}}}'`
3. New pods start first; old ones leave only when the new ones are Ready.
</details>

<details><summary>Task 2 hints</summary>

1. Add `readinessProbe.httpGet: {path: /, port: 80}`.
2. Without it a pod is Ready as soon as the container starts.
3. With maxUnavailable 0 this is what paces the rollout.
</details>

<details><summary>Task 3 hints</summary>

1. `lifecycle.preStop.exec.command: ["sleep","10"]` on the container.
2. `terminationGracePeriodSeconds: 45` on the pod spec (default is 30).
3. Order on shutdown: endpoints removed, preStop runs, SIGTERM, grace period, SIGKILL.
</details>

<details><summary>Task 4 hints</summary>

1. `kubectl create pdb checkout --selector=app=checkout --min-available=2 -n checkout-z`
2. A PDB limits drains and evictions, not crashes.
3. minAvailable 2 of 3 allows one eviction at a time.
</details>

<details><summary>Task 5 hints</summary>

1. `kubectl rollout status deployment/checkout -n checkout-z`
2. The template changed, so a new ReplicaSet takes over.
3. If it hangs, look at the readiness probe port.
</details>

<details><summary>Solution</summary>

```bash
kubectl apply -f - <<'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: checkout
  namespace: checkout-z
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxUnavailable: 0
      maxSurge: 1
  selector:
    matchLabels:
      app: checkout
  template:
    metadata:
      labels:
        app: checkout
    spec:
      terminationGracePeriodSeconds: 45
      containers:
      - name: checkout
        image: nginx:1.25
        readinessProbe:
          httpGet:
            path: /
            port: 80
        lifecycle:
          preStop:
            exec:
              command: ["sleep", "10"]
EOF
kubectl create pdb checkout --selector=app=checkout --min-available=2 -n checkout-z
kubectl rollout status deployment/checkout -n checkout-z
```
</details>
