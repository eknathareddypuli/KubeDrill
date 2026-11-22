# Pending CSRs: approve one, deny the dangerous one

**Track:** CKS · **Level:** Advanced · **Time:** 12 min · **Namespace:** `default`

Three CertificateSigningRequests are waiting. The only one the platform team actually asked for is `dev-ci`. One of the others requests membership of a group that means cluster-admin. Approve `dev-ci`, **deny** the dangerous request, record which group it asked for in `finding.txt`, and leave the third (`old-laptop`) pending until its owner confirms.

## Tasks

1. **Find out what `build-bot` asked for and write the group to `finding.txt`** — 
2. **Approve `dev-ci`** — 
3. **Deny `build-bot`** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl get csr build-bot -o jsonpath='{.spec.request}' | base64 -d | openssl req -noout -subject`
2. The O= value is the group the certificate would belong to.
3. `echo system:masters > finding.txt` (write what you actually found)
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl certificate approve dev-ci`
2. Check Issued with `kubectl get csr`.
3. Only after reading its subject: `/CN=dev-ci/O=ci`.
</details>

<details><summary>Task 3 hints</summary>

1. `kubectl certificate deny build-bot`
2. A denied CSR can be deleted later; an approved one cannot be un-issued.
3. `kubectl get csr` shows Denied.
</details>

<details><summary>Solution</summary>

```bash
kubectl get csr build-bot -o jsonpath='{.spec.request}' | base64 -d | openssl req -noout -subject
echo system:masters > finding.txt
kubectl certificate approve dev-ci
kubectl certificate deny build-bot
kubectl get csr
```
</details>
