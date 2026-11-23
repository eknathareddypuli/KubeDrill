# Change the setting in an immutable ConfigMap

**Track:** CKAD · **Level:** Intermediate · **Time:** 10 min · **Namespace:** `conf`

Deployment `web` in `conf` reads ConfigMap `web-config-v1` (`LOG_LEVEL=info`) through `envFrom`. Operations wants `LOG_LEVEL=debug`. The ConfigMap is immutable. Roll out the new value the way immutable config is meant to be changed, without editing or deleting `web-config-v1` (other release candidates still point at it).

## Tasks

1. **A new immutable ConfigMap carries `LOG_LEVEL=debug`** — 
2. **The Deployment uses it and all pods are Ready** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. Try `kubectl patch cm web-config-v1 -n conf -p '{"data":{"LOG_LEVEL":"debug"}}'`: it fails and shows why.
2. Create `web-config-v2` with `immutable: true` (needs YAML: `kubectl create cm` cannot set it).
</details>

<details><summary>Task 2 hints</summary>

1. Change `envFrom[0].configMapRef.name` to `web-config-v2`; the pod template changes, so pods roll.
2. An immutable ConfigMap never changes under a running pod, so a rollout is the only way to pick up new values.
</details>

<details><summary>Solution</summary>

```bash
kubectl apply -f - <<EOF
apiVersion: v1
kind: ConfigMap
metadata:
  name: web-config-v2
  namespace: conf
immutable: true
data:
  LOG_LEVEL: debug
EOF
kubectl patch deployment web -n conf --type=json -p '[{"op":"replace","path":"/spec/template/spec/containers/0/envFrom/0/configMapRef/name","value":"web-config-v2"}]'
kubectl rollout status deployment/web -n conf
```
</details>
