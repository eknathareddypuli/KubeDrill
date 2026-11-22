# A developer laptop was stolen: remove what the certificate can do

**Track:** CKS · **Level:** Advanced · **Time:** 15 min · **Namespace:** `sales`

Bob's laptop was stolen with his client certificate (`CN=bob`, `O=contractors`, valid one year). Kubernetes has **no certificate revocation**, so you must remove everything his identity can do. Bob must have no access anywhere. But Carol is also in group `contractors` and still needs to read pods in `finance`, and Alice must keep her access in `sales`.

## Tasks

1. **Bob has no access in `sales`** — 
2. **Bob has no cluster-wide access** — 
3. **Bob has no access in `finance` (his GROUP grants it)** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl get rolebindings,clusterrolebindings -A -o wide | grep -i bob`
2. A RoleBinding names him as a User.
3. `kubectl delete rolebinding rb-bob -n sales`
</details>

<details><summary>Task 2 hints</summary>

1. A ClusterRoleBinding also names him.
2. `kubectl delete clusterrolebinding crb-bob`
3. `kubectl auth can-i list pods -A --as bob --as-group contractors`
</details>

<details><summary>Task 3 hints</summary>

1. `rb-contractors` binds the whole group, and Bob's certificate carries `O=contractors`.
2. Carol must keep access: bind her by USER name instead of the group.
3. `kubectl delete rolebinding rb-contractors -n finance`, then `kubectl create rolebinding rb-carol --role=pod-reader --user=carol -n finance`
</details>

<details><summary>Solution</summary>

```bash
kubectl delete rolebinding rb-bob -n sales
kubectl delete clusterrolebinding crb-bob
kubectl delete rolebinding rb-contractors -n finance
kubectl create rolebinding rb-carol --role=pod-reader --user=carol -n finance
kubectl auth can-i list pods -n finance --as bob --as-group contractors
```
</details>
