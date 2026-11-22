# YAML repair: wrong indentation

**Track:** CKA, CKAD · **Level:** Beginner · **Time:** 10 min · **Namespace:** `yr-indent`

`/home/student/webpod.yaml` is valid YAML but kubectl rejects it: a field sits one level too high. Fix the file so Pod `webpod` runs in `yr-indent`.

## Tasks

1. **Pod `webpod` is Running and Ready** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl apply -f /home/student/webpod.yaml` → `unknown field "image"` in PodSpec.
2. `image` belongs to the container (aligned with `name`), not to `spec`.
3. Indent `image:` four spaces more than `- name`… i.e. align it under `name:`, then apply.
</details>

<details><summary>Solution</summary>

```bash
cat > /home/student/webpod.yaml <<'EOF'
apiVersion: v1
kind: Pod
metadata:
  name: webpod
  namespace: yr-indent
  labels:
    app: webpod
spec:
  containers:
  - name: web
    image: nginx:1.25
EOF
kubectl apply -f /home/student/webpod.yaml
```
</details>
