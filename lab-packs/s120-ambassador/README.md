# Ambassador pattern: talk to localhost, let a proxy do the rest

**Track:** CKAD · **Level:** Intermediate · **Time:** 12 min · **Namespace:** `ambassador`

The `api` Deployment talks straight to `db-prod:5432` from its `app` container. The platform team wants the app to connect to `localhost:5432` and have an **ambassador** sidecar forward to the real database. Add the sidecar and repoint the app.

## Tasks

1. **Add a second container named `ambassador` (image `nginx:1.25`)** — 
2. **The ambassador knows the upstream: env `UPSTREAM=db-prod:5432`, port 5432** — 
3. **The app connects to `localhost` and both containers are Ready** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. A pod holds several containers: append one to `spec.template.spec.containers`.
2. `kubectl patch deploy api -n ambassador --type=json -p '[{"op":"add","path":"/spec/template/spec/containers/-","value":{...}}]'`
3. Or `kubectl edit deploy api -n ambassador`.
</details>

<details><summary>Task 2 hints</summary>

1. Give the ambassador container `env: [{name: UPSTREAM, value: "db-prod:5432"}]`.
2. Expose `containerPort: 5432`.
3. The app must not need to know the real host any more.
</details>

<details><summary>Task 3 hints</summary>

1. Change `DB_HOST` of the `app` container to `localhost`.
2. A new template means a rolling update: wait for `2/2` containers.
3. `kubectl get pods -n ambassador`
</details>

<details><summary>Solution</summary>

```bash
kubectl patch deployment api -n ambassador --type=json -p '[{"op":"add","path":"/spec/template/spec/containers/-","value":{"name":"ambassador","image":"nginx:1.25","env":[{"name":"UPSTREAM","value":"db-prod:5432"}],"ports":[{"containerPort":5432}]}},{"op":"replace","path":"/spec/template/spec/containers/0/env/0/value","value":"localhost"}]'
kubectl rollout status deployment/api -n ambassador
kubectl get pods -n ambassador
```
</details>
