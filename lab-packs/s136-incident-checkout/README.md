# INCIDENT: checkout is down (four faults, one symptom)

**Track:** CKA, CKAD · **Level:** Advanced · **Time:** 20 min · **Namespace:** `inc-checkout`

Page: *"checkout returns nothing"*. Namespace `inc-checkout` holds Deployment `checkout`, Service `checkout` and a `tester` pod that plays the role of a customer. Nobody knows what is wrong, and fixing one thing may only reveal the next. Restore service so that `tester` gets an answer from `http://checkout`, with the namespace default-deny policy still in force.

## Tasks

1. **Symptom 1: both `checkout` pods are Running and Ready** — 
2. **Symptom 2: the Service has endpoints** — 
3. **Symptom 3: `tester` gets an answer from `checkout`** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl get pods -n inc-checkout`, then `kubectl describe pod` for the Events.
2. The status tells you which layer is broken: ImagePullBackOff means image, CreateContainerConfigError means something the pod references.
3. Fix the first problem, then look again: the next fault only shows up afterwards.
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl get endpoints checkout -n inc-checkout` is empty even for Ready pods.
2. Compare `kubectl get svc checkout -o yaml` (selector) with the pod labels.
3. Fix the Service selector, not the pod labels (other things select on them).
</details>

<details><summary>Task 3 hints</summary>

1. Pods Ready and endpoints present, but `kubectl exec tester -n inc-checkout -- wget -qO- -T 2 checkout` still times out.
2. `kubectl get networkpolicy -n inc-checkout`: default-deny blocks all ingress.
3. Add an allow policy for `app=checkout` from `run=tester` on port 80; keep default-deny.
</details>

<details><summary>Solution</summary>

```bash
kubectl get pods -n inc-checkout
kubectl set image deployment/checkout checkout=nginx:1.25 -n inc-checkout
kubectl create configmap checkout-cfg --from-literal=mode=live -n inc-checkout
kubectl patch svc checkout -n inc-checkout --type=merge -p '{"spec":{"selector":{"app":"checkout"}}}'
kubectl apply -f - <<'EOF'
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-tester-to-checkout
  namespace: inc-checkout
spec:
  podSelector:
    matchLabels:
      app: checkout
  policyTypes: ["Ingress"]
  ingress:
  - from:
    - podSelector:
        matchLabels:
          run: tester
    ports:
    - protocol: TCP
      port: 80
EOF
kubectl exec tester -n inc-checkout -- wget -qO- -T 2 checkout
```
</details>
