# CAPSTONE (CKS): harden the payments namespace

**Track:** CKS · **Level:** Advanced · **Time:** 45 min · **Namespace:** `cap-cks`

Security review of `cap-cks` found ten problems (partial credit, pass mark 66 of 100). The workload is Deployment `pay`:
1. the namespace does not enforce the `restricted` Pod Security Standard;
2. `pay` runs as root with privilege escalation, all capabilities and no seccomp profile;
3. the `default` ServiceAccount is bound to cluster-admin;
4. nothing restricts traffic to `pay`: only pods labelled `app=gateway` may reach it (`intruder` must be blocked);
5. the API key Secret `pay-key` is injected as an environment variable: mount it read-only as a volume at `/etc/pay`;
6. a privileged pod `debug-tools` is running;
7. `pay` uses `nginxinc/nginx-unprivileged:latest`: pin the tag to `1.25`;
8. the pod mounts an API token it never uses;
9. the admission policy `pin-images` is not enforced in this namespace: bind it (Deny);
10. `pay` has no CPU and memory limits.

## Tasks

1. **The namespace enforces `restricted`** — 
2. **`pay` meets the `restricted` profile and is Ready** — 
3. **The `default` ServiceAccount has no cluster-wide power** — 
4. **Only `gateway` reaches `pay`** — 
5. **The Secret is a read-only volume at `/etc/pay`, not an environment variable** — 
6. **The privileged pod is gone** — 
7. **The image is pinned to `1.25`** — 
8. **`pay` does not automount a service account token** — 
9. **The admission policy is enforced here** — 
10. **`pay` has CPU and memory limits** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl label namespace cap-cks pod-security.kubernetes.io/enforce=restricted`
</details>

<details><summary>Task 2 hints</summary>

1. runAsNonRoot: true, allowPrivilegeEscalation: false, capabilities.drop: [ALL], seccompProfile.type: RuntimeDefault.
2. Also set a non-zero `runAsUser`.
</details>

<details><summary>Task 3 hints</summary>

1. `kubectl get clusterrolebindings -o wide | grep cap-cks`
</details>

<details><summary>Task 4 hints</summary>

1. A default-deny ingress policy plus an allow rule for `app=gateway`.
</details>

<details><summary>Task 5 hints</summary>

1. Remove `env`, add `volumes` (secret) and `volumeMounts` with `readOnly: true`.
</details>

<details><summary>Task 6 hints</summary>

1. `kubectl get pods -n cap-cks -o yaml | grep -B3 privileged`
</details>

<details><summary>Task 7 hints</summary>

1. The tag is part of the supply chain: pinned tags are reproducible.
</details>

<details><summary>Task 8 hints</summary>

1. `automountServiceAccountToken: false` in the pod spec.
</details>

<details><summary>Task 9 hints</summary>

1. A ValidatingAdmissionPolicyBinding with `Deny`, scoped to this namespace.
</details>

<details><summary>Task 10 hints</summary>

1. `resources.limits` for cpu and memory.
</details>

<details><summary>Solution</summary>

```bash
kubectl delete pod debug-tools -n cap-cks --wait=false
kubectl delete clusterrolebinding cap-default-admin
kubectl patch deployment pay -n cap-cks --type=json -p '[{"op":"replace","path":"/spec/template/spec/containers/0/image","value":"nginxinc/nginx-unprivileged:1.25"},{"op":"replace","path":"/spec/template/spec/containers/0/securityContext","value":{"runAsNonRoot":true,"runAsUser":101,"allowPrivilegeEscalation":false,"capabilities":{"drop":["ALL"]}}},{"op":"add","path":"/spec/template/spec/securityContext","value":{"seccompProfile":{"type":"RuntimeDefault"}}},{"op":"add","path":"/spec/template/spec/automountServiceAccountToken","value":false},{"op":"remove","path":"/spec/template/spec/containers/0/env"},{"op":"add","path":"/spec/template/spec/containers/0/volumeMounts","value":[{"name":"key","mountPath":"/etc/pay","readOnly":true}]},{"op":"add","path":"/spec/template/spec/volumes","value":[{"name":"key","secret":{"secretName":"pay-key"}}]},{"op":"add","path":"/spec/template/spec/containers/0/resources","value":{"requests":{"cpu":"50m","memory":"32Mi"},"limits":{"cpu":"200m","memory":"128Mi"}}}]'
kubectl label namespace cap-cks pod-security.kubernetes.io/enforce=restricted
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: default-deny
  namespace: cap-cks
spec:
  podSelector: {}
  policyTypes: ["Ingress"]
---
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-gateway
  namespace: cap-cks
spec:
  podSelector:
    matchLabels:
      app: pay
  policyTypes: ["Ingress"]
  ingress:
  - from:
    - podSelector:
        matchLabels:
          app: gateway
EOF
kubectl apply -f - <<EOF
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicyBinding
metadata:
  name: pin-images-cks
spec:
  policyName: pin-images
  validationActions: ["Deny"]
  matchResources:
    namespaceSelector:
      matchLabels:
        kubernetes.io/metadata.name: cap-cks
EOF
```
</details>
