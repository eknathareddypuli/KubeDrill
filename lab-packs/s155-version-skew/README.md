# Version skew: which components are out of policy?

**Track:** CKA · **Level:** Intermediate · **Time:** 10 min · **Namespace:** `default`

Before an upgrade window the inventory in `/home/student/versions.txt` was exported. The API server is `v1.30.2`. Write `/home/student/violations.txt` with the component names (one per line) that break the Kubernetes version-skew policy and would need attention first. List only violators.

## Tasks

1. **The three violators are listed** — 
2. **Compliant components are not listed** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. Compare each minor with the apiserver minor (30).
2. kube-scheduler is 28: two behind, only one is allowed. kubelet 26 is four behind; kubelet 31 is newer than the API server.
</details>

<details><summary>Task 2 hints</summary>

1. Allowed: controller-manager 30, kubelet 27 (3 behind), kubelet 30, kubectl 31 (one ahead).
2. Do not include the apiserver itself.
</details>

<details><summary>Solution</summary>

```bash
printf 'kube-scheduler\nkubelet-worker3\nkubelet-worker4\n' > /home/student/violations.txt
```
</details>
