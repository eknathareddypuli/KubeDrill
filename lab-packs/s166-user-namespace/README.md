# Map root in the container to a harmless host user

**Track:** CKS · **Level:** Intermediate · **Time:** 8 min · **Namespace:** `userns`

Deployment `legacy` in `userns` runs a vendor image that must run as root inside the container. Security wants root in the container mapped to an unprivileged user on the node, so a container escape does not land as root. Make the pods use their own user namespace. Keep the image and keep it running as root.

## Tasks

1. **The pod template sets `hostUsers: false`** — 
2. **Both pods are Ready with the new setting** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl explain pod.spec.hostUsers`
2. `kubectl patch deployment legacy -n userns -p '{"spec":{"template":{"spec":{"hostUsers":false}}}}'`
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl get pods -n userns -o jsonpath='{.items[*].spec.hostUsers}'`
</details>

<details><summary>Solution</summary>

```bash
kubectl patch deployment legacy -n userns -p '{"spec":{"template":{"spec":{"hostUsers":false}}}}'
kubectl rollout status deployment/legacy -n userns
```
</details>
