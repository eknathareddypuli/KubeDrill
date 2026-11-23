# One directory from a ConfigMap, a Secret and the Downward API

**Track:** CKAD · **Level:** Intermediate · **Time:** 12 min · **Namespace:** `proj`

Deployment `agent` in `proj` expects everything under `/etc/agent`: the ConfigMap `agent-config`, the Secret `agent-token` and the pod's own labels (as a file named `labels`). It currently mounts only the ConfigMap, so the agent cannot start. Mount all three into ONE directory with a `projected` volume named `agent-etc` and keep it Ready.

## Tasks

1. **A projected volume `agent-etc` combines the three sources** — 
2. **The container mounts `agent-etc` at `/etc/agent` and the pod is Ready** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl explain pod.spec.volumes.projected.sources --recursive`
2. sources: a configMap entry, a secret entry, and a downwardAPI entry with items: path `labels`, fieldRef.fieldPath `metadata.labels`.
</details>

<details><summary>Task 2 hints</summary>

1. The volumeMount name must match the new volume name.
</details>

<details><summary>Solution</summary>

```bash
kubectl patch deployment agent -n proj --type=json -p '[{"op":"replace","path":"/spec/template/spec/volumes","value":[{"name":"agent-etc","projected":{"sources":[{"configMap":{"name":"agent-config"}},{"secret":{"name":"agent-token"}},{"downwardAPI":{"items":[{"path":"labels","fieldRef":{"fieldPath":"metadata.labels"}}]}}]}}]},{"op":"replace","path":"/spec/template/spec/containers/0/volumeMounts/0/name","value":"agent-etc"}]'
kubectl rollout status deployment/agent -n proj
```
</details>
