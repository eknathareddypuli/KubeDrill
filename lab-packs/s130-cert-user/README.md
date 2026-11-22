# Onboard a developer: client certificate, RBAC, kubeconfig

**Track:** CKA, CKS · **Level:** Advanced · **Time:** 20 min · **Namespace:** `dev`

Jane joins the `dev` team and needs read-only access to pods in namespace `dev`, nothing else. Kubernetes has no user objects: identity comes from a **client certificate**. Create her key and CSR (`/CN=jane/O=dev`), submit a `CertificateSigningRequest` named `jane` (signer `kubernetes.io/kube-apiserver-client`, valid 24h), approve it, save the certificate as `jane.crt`, bind read-only pod access for the group `dev` in `dev`, and add a kubeconfig user `jane` and context `jane-dev` (namespace `dev`).

## Tasks

1. **Submit CSR `jane` (client-auth signer, 24h) and approve it** — 
2. **Save the issued certificate as `jane.crt`** — 
3. **Give group `dev` read-only pods in `dev` (Role `pod-reader` already exists)** — 
4. **Add kubeconfig user `jane` and context `jane-dev` (namespace `dev`)** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `openssl genrsa -out jane.key 2048`, then `openssl req -new -key jane.key -out jane.csr -subj "/CN=jane/O=dev"`.
2. The CSR object needs the BASE64 of the .csr file on ONE line: `cat jane.csr | base64 | tr -d "\n"`. Fields: `signerName: kubernetes.io/kube-apiserver-client`, `expirationSeconds: 86400`, `usages: [client auth]`.
3. `kubectl certificate approve jane`; then `kubectl get csr` should say Approved,Issued.
</details>

<details><summary>Task 2 hints</summary>

1. The certificate is base64 in `.status.certificate`.
2. `kubectl get csr jane -o jsonpath='{.status.certificate}' | base64 -d > jane.crt`
3. `openssl x509 -in jane.crt -noout -subject` should show CN = jane, O = dev.
</details>

<details><summary>Task 3 hints</summary>

1. The group comes from the certificate `O=dev`, so bind the GROUP.
2. `kubectl create rolebinding dev-pod-readers --role=pod-reader --group=dev -n dev`
3. `kubectl auth can-i list pods --as jane --as-group dev -n dev`
</details>

<details><summary>Task 4 hints</summary>

1. `kubectl config set-credentials jane --client-certificate=jane.crt --client-key=jane.key --embed-certs=true`
2. `kubectl config set-context jane-dev --cluster=kubedrill --user=jane --namespace=dev` (the cluster name comes from `kubectl config get-contexts`).
3. Test as Jane: `kubectl --context jane-dev get pods` works, `... delete pod x` is Forbidden.
</details>

<details><summary>Solution</summary>

```bash
openssl genrsa -out jane.key 2048
openssl req -new -key jane.key -out jane.csr -subj "/CN=jane/O=dev"
kubectl apply -f - <<EOF
apiVersion: certificates.k8s.io/v1
kind: CertificateSigningRequest
metadata:
  name: jane
spec:
  request: $(cat jane.csr | base64 | tr -d "\n")
  signerName: kubernetes.io/kube-apiserver-client
  expirationSeconds: 86400
  usages:
  - client auth
EOF
kubectl certificate approve jane
kubectl get csr jane -o jsonpath='{.status.certificate}' | base64 -d > jane.crt
kubectl create rolebinding dev-pod-readers --role=pod-reader --group=dev -n dev
kubectl config set-credentials jane --client-certificate=jane.crt --client-key=jane.key --embed-certs=true
kubectl config set-context jane-dev --cluster=kubedrill --user=jane --namespace=dev
kubectl --context jane-dev get pods
```
</details>
