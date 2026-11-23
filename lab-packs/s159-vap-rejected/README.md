# Your deployment is rejected by an admission policy

**Track:** CKAD · **Level:** Intermediate · **Time:** 10 min · **Namespace:** `teamx`

Namespace `teamx` is governed by ValidatingAdmissionPolicy `team-rules`. `kubectl apply -f /home/student/web.yaml` is rejected. Read the errors and fix the manifest so Deployment `web` is created and Ready. Do not touch the policy or its binding: they belong to the platform team.

## Tasks

1. **Deployment `web` exists with at most 4 replicas** — 
2. **It carries an `owner` label and a registry.k8s.io image** — 
3. **All pods are Ready** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl apply -f /home/student/web.yaml` and read the message.
2. The first denied rule is about replicas.
</details>

<details><summary>Task 2 hints</summary>

1. Rule 2: `metadata.labels.owner`. Rule 3: the image prefix.
2. A registry.k8s.io image that exists: `registry.k8s.io/pause:3.9` (the app image is only a stand-in in this lab).
</details>

<details><summary>Task 3 hints</summary>

1. `kubectl get pods -n teamx`
</details>

<details><summary>Solution</summary>

```bash
kubectl apply -f /home/student/web.yaml
cat > /home/student/web.yaml <<'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: web
  namespace: teamx
  labels:
    owner: teamx
spec:
  replicas: 3
  selector:
    matchLabels:
      app: web
  template:
    metadata:
      labels:
        app: web
    spec:
      containers:
      - name: web
        image: registry.k8s.io/pause:3.9
EOF
kubectl apply -f /home/student/web.yaml
```
</details>
