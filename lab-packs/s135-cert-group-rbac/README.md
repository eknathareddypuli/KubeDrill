# Auditors cannot read pods: bind the group the certificate carries

**Track:** CKS · **Level:** Advanced · **Time:** 12 min · **Namespace:** `default`

The audit bot has a client certificate (`CN=audit-bot`, `O=auditors`). Someone created ClusterRoleBinding `auditors-view` for the `pod-viewer` role, but the bot still gets Forbidden. The auditors may read pods cluster-wide, never Secrets, never delete anything.

## Tasks

1. **Find out who the bot is and write its GROUP to `bot-group.txt`** — 
2. **The auditors can list pods cluster-wide** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl get csr audit-bot -o jsonpath='{.spec.request}' | base64 -d | openssl req -noout -subject`
2. CN is the user, O is the group.
3. `echo auditors > bot-group.txt` (what you actually found)
</details>

<details><summary>Task 2 hints</summary>

1. Change the subject kind from User to Group (the name `auditors` is right).
2. `kubectl patch clusterrolebinding auditors-view --type=json -p='[{"op":"replace","path":"/subjects/0/kind","value":"Group"}]'`
3. Or delete and recreate: `kubectl create clusterrolebinding auditors-view --clusterrole=pod-viewer --group=auditors`.
</details>

<details><summary>Solution</summary>

```bash
kubectl get csr audit-bot -o jsonpath='{.spec.request}' | base64 -d | openssl req -noout -subject
echo auditors > bot-group.txt
kubectl patch clusterrolebinding auditors-view --type=json -p='[{"op":"replace","path":"/subjects/0/kind","value":"Group"}]'
kubectl auth can-i list pods -A --as audit-bot --as-group auditors
```
</details>
