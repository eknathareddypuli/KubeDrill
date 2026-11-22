# Review a manifest: fix six production anti-patterns

**Track:** CKAD · **Level:** Intermediate · **Time:** 15 min · **Namespace:** `review`

A teammate asks for a review of the `orders-web` Deployment before it goes live. It deploys, but it is not production-ready. Fix: an unpinned image, no resources, no readiness probe, running as root, a plaintext password in `env`, and a single replica.

## Tasks

1. **Pin the image to an explicit version** — 
2. **Set CPU/memory requests and a memory limit** — 
3. **Add an HTTP readiness probe** — 
4. **Run as non-root without privilege escalation** — 
5. **Read the password from Secret `orders-db`** — 
6. **Run 2 replicas, all Ready** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `latest` (or no tag) is not reproducible.
2. `kubectl set image deployment/orders-web web=nginxinc/nginx-unprivileged:1.25 -n review`
3. A digest (`@sha256:...`) is even stricter.
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl set resources deployment/orders-web -n review --requests=cpu=100m,memory=64Mi --limits=memory=128Mi`
2. Requests drive scheduling; the limit protects the node.
3. Limits without requests default the request to the limit.
</details>

<details><summary>Task 3 hints</summary>

1. `readinessProbe.httpGet` with `path: /` and `port: 8080` (this image listens on 8080).
2. Use `kubectl edit` or a JSON patch.
3. Traffic is only sent to Ready pods.
</details>

<details><summary>Task 4 hints</summary>

1. `securityContext: {runAsNonRoot: true, runAsUser: 101, allowPrivilegeEscalation: false}` on the container.
2. The unprivileged nginx image already runs as user 101.
3. `kubectl edit deploy orders-web -n review`
</details>

<details><summary>Task 5 hints</summary>

1. The Secret already exists: `kubectl get secret orders-db -n review`.
2. `env[0].valueFrom.secretKeyRef: {name: orders-db, key: password}` and remove the plain `value`.
3. A patch must replace the whole env entry.
</details>

<details><summary>Task 6 hints</summary>

1. `kubectl scale deployment orders-web --replicas=2 -n review`
2. Check the rollout finished: `kubectl rollout status`.
3. One replica is a single point of failure during every rollout.
</details>

<details><summary>Solution</summary>

```bash
kubectl apply -f - <<'EOF'
apiVersion: apps/v1
kind: Deployment
metadata:
  name: orders-web
  namespace: review
spec:
  replicas: 2
  selector:
    matchLabels:
      app: orders-web
  template:
    metadata:
      labels:
        app: orders-web
    spec:
      containers:
      - name: web
        image: nginxinc/nginx-unprivileged:1.25
        resources:
          requests:
            cpu: 100m
            memory: 64Mi
          limits:
            memory: 128Mi
        readinessProbe:
          httpGet:
            path: /
            port: 8080
        securityContext:
          runAsNonRoot: true
          runAsUser: 101
          allowPrivilegeEscalation: false
        env:
        - name: DB_PASSWORD
          valueFrom:
            secretKeyRef:
              name: orders-db
              key: password
EOF
kubectl rollout status deployment/orders-web -n review
```
</details>
