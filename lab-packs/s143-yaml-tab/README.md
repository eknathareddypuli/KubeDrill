# YAML repair: the tab character

**Track:** CKA, CKAD · **Level:** Beginner · **Time:** 10 min · **Namespace:** `yr-tab`

`/home/student/tabby.yaml` was pasted from a wiki and `kubectl apply -f` refuses it. Repair the file (not the cluster) and apply it so Deployment `tabby` runs 2 ready pods in `yr-tab`.

## Tasks

1. **Deployment `tabby` has 2 Ready pods** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl apply -f /home/student/tabby.yaml` names the line.
2. `cat -A /home/student/tabby.yaml` shows `^I` where tabs are.
3. Rewrite the two lines with spaces: `cat > /home/student/tabby.yaml <<'EOF'` ... or a sed that replaces the tab, then apply.
</details>

<details><summary>Solution</summary>

```bash
cat > /home/student/tabby.yaml <<'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: tabby
  namespace: yr-tab
spec:
  replicas: 2
  selector:
    matchLabels:
      app: tabby
  template:
    metadata:
      labels:
        app: tabby
    spec:
      containers:
      - name: c
        image: nginx:1.25
EOF
kubectl apply -f /home/student/tabby.yaml
```
</details>
