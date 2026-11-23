# An admission policy that does nothing: add the binding

**Track:** CKA, CKS · **Level:** Advanced · **Time:** 12 min · **Namespace:** `default`

The platform team created ValidatingAdmissionPolicy `no-latest` (images must be pinned to a tag other than `latest`), but `latest` images are still being deployed to `shop-prod`. Activate it for namespaces labelled `env=prod` only (`shop-prod`); `shop-dev` must keep accepting anything. Do not change the policy itself.

## Tasks

1. **A `latest` image is rejected in `shop-prod`** — 
2. **A pinned image is still accepted in `shop-prod`** — 
3. **`shop-dev` is not affected** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl get validatingadmissionpolicy` then `kubectl explain validatingadmissionpolicybinding.spec`
2. You need policyName, validationActions: [Deny] and matchResources.namespaceSelector.
3. Select by the label `env: prod`; or by `kubernetes.io/metadata.name: shop-prod`.
</details>

<details><summary>Task 2 hints</summary>

1. Deny must only block what the policy says.
</details>

<details><summary>Task 3 hints</summary>

1. The binding must be scoped. Without matchResources it applies cluster-wide.
</details>

<details><summary>Solution</summary>

```bash
kubectl get validatingadmissionpolicy
kubectl apply -f - <<EOF
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicyBinding
metadata:
  name: no-latest-prod
spec:
  policyName: no-latest
  validationActions: ["Deny"]
  matchResources:
    namespaceSelector:
      matchLabels:
        env: prod
EOF
```
</details>
