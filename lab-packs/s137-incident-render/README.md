# INCIDENT: render workers will not run (leave the sick node alone)

**Track:** CKA · **Level:** Advanced · **Time:** 20 min · **Namespace:** `inc-render`

Deployment `render` (3 replicas) should run on SSD nodes. After a maintenance window nothing runs. `worker2` was cordoned on purpose: its disk is failing and hardware is replacing it. Everything else is yours to fix. Get 3 `render` pods Ready on suitable nodes **without touching `worker2`**.

## Tasks

1. **Symptom 1: render pods are scheduled somewhere** — 
2. **Symptom 2: a node actually satisfies `disk=ssd`** — 
3. **Symptom 3: all 3 pods are Ready (the namespace quota allows them)** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl describe pod -n inc-render` → read the scheduler message: how many nodes, and why each was rejected.
2. Two different reasons appear: unschedulable nodes and a selector that matches no node.
3. `kubectl get nodes --show-labels`
</details>

<details><summary>Task 2 hints</summary>

1. Label the schedulable node: `kubectl label node worker1 disk=ssd`.
2. worker2 would match too, but it must stay out of service.
3. Check with `kubectl get pods -n inc-render -o wide`.
</details>

<details><summary>Task 3 hints</summary>

1. `kubectl describe rs -n inc-render` shows `exceeded quota`: the pod quota is 2.
2. `kubectl patch resourcequota render-pods -n inc-render -p '{"spec":{"hard":{"pods":"3"}}}'`
3. Raise it to what the workload needs, not to a huge number.
</details>

<details><summary>Solution</summary>

```bash
kubectl describe pod -n inc-render
kubectl uncordon worker1
kubectl label node worker1 disk=ssd
kubectl patch resourcequota render-pods -n inc-render -p '{"spec":{"hard":{"pods":"3"}}}'
kubectl get pods -n inc-render -o wide
```
</details>
