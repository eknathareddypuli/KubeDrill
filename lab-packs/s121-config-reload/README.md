# Change config without a restart: volume vs env

**Track:** CKAD · **Level:** Intermediate · **Time:** 12 min · **Namespace:** `reload`

The `web` Deployment reads the feature flag `FEATURE` from ConfigMap `flags` through an **environment variable**. Product wants to flip it to `on` and see it live **without restarting pods**. Env vars are fixed at container start, so switch to a mounted volume at `/etc/flags`, then flip the flag.

## Tasks

1. **Mount ConfigMap `flags` at `/etc/flags` and drop the env var** — 
2. **Both pods are Ready on the new template** — 
3. **Flip `FEATURE` to `on` and see it in the running pods** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. A `volumes` entry with `configMap.name: flags` plus a `volumeMounts` entry at `/etc/flags`.
2. Remove the `env` block so the flag has one source of truth.
3. `kubectl patch deploy web -n reload --type=json -p '[...]'` or `kubectl edit`.
</details>

<details><summary>Task 2 hints</summary>

1. One rollout is needed to change the pod template.
2. `kubectl rollout status deploy/web -n reload`
3. `kubectl exec deploy/web -n reload -- cat /etc/flags/FEATURE` shows `off`.
</details>

<details><summary>Task 3 hints</summary>

1. `kubectl patch cm flags -n reload -p '{"data":{"FEATURE":"on"}}'`
2. No new rollout: read the file again.
3. `kubectl exec deploy/web -n reload -- cat /etc/flags/FEATURE`
</details>

<details><summary>Solution</summary>

```bash
kubectl patch deployment web -n reload --type=json -p '[{"op":"remove","path":"/spec/template/spec/containers/0/env"},{"op":"add","path":"/spec/template/spec/volumes","value":[{"name":"flags","configMap":{"name":"flags"}}]},{"op":"add","path":"/spec/template/spec/containers/0/volumeMounts","value":[{"name":"flags","mountPath":"/etc/flags"}]}]'
kubectl rollout status deployment/web -n reload
kubectl patch configmap flags -n reload -p '{"data":{"FEATURE":"on"}}'
kubectl exec deploy/web -n reload -- cat /etc/flags/FEATURE
```
</details>
