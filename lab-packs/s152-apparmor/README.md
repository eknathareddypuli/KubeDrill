# AppArmor: write a profile and attach it with the current field

**Track:** CKS · **Level:** Advanced · **Time:** 15 min · **Namespace:** `cks-aa`

Deployment `web` in `cks-aa` still uses the deprecated annotation `container.apparmor.security.beta.kubernetes.io/c`. Move it to the supported `securityContext.appArmorProfile` field using the node profile `k8s-deny-write`, and write that profile to `/home/student/k8s-deny-write` so it can be loaded: it must deny all file writes.

## Tasks

1. **The container uses `appArmorProfile` type `Localhost` with profile `k8s-deny-write`** — 
2. **The profile file is named `k8s-deny-write` and denies writes** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. The field lives under the container: `securityContext.appArmorProfile`.
2. `type: Localhost` and `localhostProfile: k8s-deny-write`.
3. `kubectl explain pod.spec.containers.securityContext.appArmorProfile`
</details>

<details><summary>Task 2 hints</summary>

1. Profile syntax: `profile NAME flags=(attach_disconnected) { ... }`.
2. Inside: `#include <abstractions/base>`, `file,` to allow everything else, then `deny /** w,`.
</details>

<details><summary>Solution</summary>

```bash
kubectl patch deployment web -n cks-aa --type=json -p '[{"op":"remove","path":"/spec/template/metadata/annotations"},{"op":"add","path":"/spec/template/spec/containers/0/securityContext","value":{"appArmorProfile":{"type":"Localhost","localhostProfile":"k8s-deny-write"}}}]'
cat > /home/student/k8s-deny-write <<'EOF'
#include <tunables/global>
profile k8s-deny-write flags=(attach_disconnected) {
  #include <abstractions/base>
  file,
  deny /** w,
}
EOF
```
</details>
