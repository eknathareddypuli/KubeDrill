#!/usr/bin/env bash
# Run every KubeDrill lab pack against a REAL cluster and record whether it behaves like the simulator says:
#   setup.sh  -> check.sh must FAIL (the lab is broken)
#   solution.sh -> check.sh must PASS (the reference fix works)
#   reset.sh  -> clean up
# Needs: kubectl, a throw-away cluster (kind recommended). NEVER point this at a cluster you care about: it creates and deletes namespaces.
#   kind create cluster --name kubedrill --config <(printf 'kind: Cluster\napiVersion: kind.x-k8s.io/v1alpha4\nnodes: [{role: control-plane},{role: worker},{role: worker}]\n')
#   kubectl label node kubedrill-worker  kubernetes.io/hostname=worker1 --overwrite   # labs say worker1/worker2: rename or label as you prefer
#   bash tools/conformance-real.sh [lab-id-prefix]
# Output: conformance-real.tsv (lab, before-check, after-check, verdict). Sim and cluster disagree => open an issue with that line.
set -uo pipefail
cd "$(dirname "$0")/../lab-packs" || exit 1
ctx="$(kubectl config current-context)"; echo "context: $ctx"
case "$ctx" in kind-*|minikube|k3d-*|docker-desktop) ;; *) read -r -p "Context '$ctx' does not look like a throw-away cluster. Type YES to continue: " a; [ "$a" = YES ] || exit 1;; esac
out="../conformance-real.tsv"; printf 'lab\tbefore\tafter\tverdict\n' > "$out"
for d in s*/; do
  id="${d%/}"; [ -n "${1:-}" ] && [[ "$id" != "$1"* ]] && continue
  bash "$id/reset.sh" >/dev/null 2>&1; bash "$id/setup.sh" >/dev/null 2>&1; sleep 15
  bash "$id/check.sh" >/dev/null 2>&1; b=$?
  (cd "$HOME" && bash "$OLDPWD/$id/solution.sh" >/dev/null 2>&1); sleep 30
  bash "$id/check.sh" >/dev/null 2>&1; a=$?
  v=OK; [ $b -eq 0 ] && v="BROKEN-STATE-PASSES"; [ $a -ne 0 ] && v="SOLUTION-FAILS"
  printf '%s\t%s\t%s\t%s\n' "$id" "$b" "$a" "$v" | tee -a "$out"
  bash "$id/reset.sh" >/dev/null 2>&1
done
echo "done: see conformance-real.tsv"
