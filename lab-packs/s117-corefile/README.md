# DNS is up but Service names do not resolve: the Corefile

**Track:** CKA · **Level:** Intermediate · **Time:** 12 min · **Namespace:** `dns-lab`

After a cluster tweak, pods in `dns-lab` cannot reach `backend-svc` by name. The CoreDNS pods are Running and Ready, so the problem is in its configuration. Fix the ConfigMap in `kube-system` and prove resolution from the `tester` pod.

## Tasks

1. **Find the typo in the `kubernetes` plugin line of the Corefile** — 
2. **`tester` resolves and reaches `backend-svc` by short name** — 
3. **It also works with the fully qualified name** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl get cm coredns -n kube-system -o yaml`
2. The plugin line must name the cluster domain exactly: `cluster.local`.
3. Compare `cluster.locl`.
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl exec tester -n dns-lab -- wget -qO- -T 2 backend-svc`
2. `bad address` means DNS failed; `refused` or a timeout is a different problem.
3. CoreDNS has the `reload` plugin, so it picks up the new file by itself.
</details>

<details><summary>Task 3 hints</summary>

1. `backend-svc.dns-lab.svc.cluster.local`
2. Search domains (`/etc/resolv.conf`) are what make the short name work.
3. Check with `kubectl exec tester -n dns-lab -- cat /etc/resolv.conf`.
</details>

<details><summary>Solution</summary>

```bash
kubectl get cm coredns -n kube-system -o yaml
kubectl get cm coredns -n kube-system -o yaml | sed 's/cluster.locl/cluster.local/' | kubectl replace -f -
kubectl exec tester -n dns-lab -- wget -qO- -T 2 backend-svc
```
</details>
