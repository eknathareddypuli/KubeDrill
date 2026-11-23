# Documentation lookup: build the object from explain, not from memory

**Track:** CKAD, CKA · **Level:** Advanced · **Time:** 15 min · **Namespace:** `spread`

Deployment `web` in `spread` has 3 replicas and every pod has landed on the same node. Add a pod topology spread constraint so pods are spread across nodes (`kubernetes.io/hostname`) with a maximum skew of 1, refusing to schedule rather than piling up (`DoNotSchedule`), selecting its own pods by the label `app=web`. Look up the exact field names with `kubectl explain`; a typo is rejected by the API.

## Tasks

1. **The pod template has the constraint with the three right values** — 
2. **It selects its own pods and the rollout is Ready** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl explain pod.spec.topologySpreadConstraints --recursive`
2. maxSkew: 1, topologyKey: kubernetes.io/hostname, whenUnsatisfiable: DoNotSchedule.
</details>

<details><summary>Task 2 hints</summary>

1. `labelSelector.matchLabels: {app: web}`
</details>

<details><summary>Solution</summary>

```bash
kubectl explain pod.spec.topologySpreadConstraints
kubectl patch deployment web -n spread -p '{"spec":{"template":{"spec":{"topologySpreadConstraints":[{"maxSkew":1,"topologyKey":"kubernetes.io/hostname","whenUnsatisfiable":"DoNotSchedule","labelSelector":{"matchLabels":{"app":"web"}}}]}}}}'
kubectl rollout status deployment/web -n spread
```
</details>
