# CAPSTONE (CKAD): ship the orders service

**Track:** CKAD · **Level:** Advanced · **Time:** 45 min · **Namespace:** `cap-ckad`

The `orders` service in `cap-ckad` has been rejected in review. Ten things need fixing or adding (partial credit, pass mark 66 of 100):
1. `orders` (2 replicas) cannot pull its image;
2. then it fails on a ConfigMap key;
3. and on a Secret key;
4. and its readiness probe;
5. all pods end up Ready;
6. Service `orders` must reach them (check with the `tester` pod);
7. Job `migrate` must complete;
8. CronJob `report` should run hourly (`0 * * * *`) and never overlap;
9. an HorizontalPodAutoscaler `orders` (2–5 replicas, 70% CPU) is required;
10. an Ingress `orders` routes host `orders.example.com`, path `/` to the Service on port 80.

## Tasks

1. **`orders` image is a tag that exists** — 
2. **The ConfigMap key reference resolves** — 
3. **The Secret key reference resolves** — 
4. **The readiness probe checks the port the app listens on** — 
5. **Both `orders` pods are Ready** — 
6. **Service `orders` answers from `tester`** — 
7. **Job `migrate` completed** — 
8. **CronJob `report` runs hourly and forbids overlap** — 
9. **HPA `orders` scales 2–5 at 70% CPU** — 
10. **Ingress `orders` routes `orders.example.com` / to Service `orders:80`** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl describe pod -n cap-ckad` → ErrImagePull. `nginx:1.25` exists.
</details>

<details><summary>Task 2 hints</summary>

1. After the image is fixed the pod says CreateContainerConfigError: which key does it want, and which keys exist?
2. Add the key to `orders-cfg` (a new key does not change the existing ones), or point the env var at an existing key.
</details>

<details><summary>Task 3 hints</summary>

1. Same error class: `kubectl get secret orders-db -n cap-ckad -o jsonpath='{.data}'` shows the actual key.
</details>

<details><summary>Task 4 hints</summary>

1. nginx listens on 80.
</details>

<details><summary>Task 5 hints</summary>

1. `kubectl rollout status deployment/orders -n cap-ckad`
</details>

<details><summary>Task 6 hints</summary>

1. `targetPort` must be the port the container listens on (80).
</details>

<details><summary>Task 7 hints</summary>

1. A Job's pod template is immutable: delete and recreate with a command that succeeds.
</details>

<details><summary>Task 8 hints</summary>

1. `kubectl patch cronjob report -n cap-ckad -p ...`
</details>

<details><summary>Task 9 hints</summary>

1. `kubectl autoscale deployment orders --min=2 --max=5 --cpu-percent=70 -n cap-ckad`
</details>

<details><summary>Task 10 hints</summary>

1. `kubectl create ingress orders --rule="orders.example.com/*=orders:80" -n cap-ckad`
</details>

<details><summary>Solution</summary>

```bash
kubectl patch deployment orders -n cap-ckad --type=json -p '[{"op":"replace","path":"/spec/template/spec/containers/0/image","value":"nginx:1.25"},{"op":"replace","path":"/spec/template/spec/containers/0/env/1/valueFrom/secretKeyRef/key","value":"password"},{"op":"replace","path":"/spec/template/spec/containers/0/readinessProbe/httpGet/port","value":80}]'
kubectl patch configmap orders-cfg -n cap-ckad -p '{"data":{"LOG_LEVEL":"info"}}'
kubectl patch service orders -n cap-ckad -p '{"spec":{"ports":[{"port":80,"targetPort":80}]}}'
kubectl delete job migrate -n cap-ckad
kubectl create job migrate --image=busybox:1.36 -n cap-ckad -- sh -c "echo migrated"
kubectl patch cronjob report -n cap-ckad -p '{"spec":{"schedule":"0 * * * *","concurrencyPolicy":"Forbid"}}'
kubectl autoscale deployment orders --min=2 --max=5 --cpu-percent=70 -n cap-ckad
kubectl create ingress orders --rule="orders.example.com/*=orders:80" -n cap-ckad
```
</details>
