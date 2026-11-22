# YAML repair: selector that matches nothing

**Track:** CKA, CKAD · **Level:** Intermediate · **Time:** 10 min · **Namespace:** `yr-sel`

`/home/student/site.yaml` fails to apply: the API server says the Deployment is invalid. Repair the file and deploy `site` (2 replicas) in `yr-sel`, keeping the label `app: site` on the pods.

## Tasks

1. **Deployment `site` has 2 Ready pods** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl apply -f /home/student/site.yaml` → selector does not match template labels.
2. Change `matchLabels` to `app: site` (the pod label stays).
3. Apply again and check `kubectl get pods -n yr-sel`.
</details>

<details><summary>Solution</summary>

```bash
sed -i s/app:\ web/app:\ site/ /home/student/site.yaml
kubectl apply -f /home/student/site.yaml
```
</details>
