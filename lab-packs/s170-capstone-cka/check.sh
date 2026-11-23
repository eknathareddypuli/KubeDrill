#!/usr/bin/env bash
# KubeDrill lab pack: CAPSTONE (CKA): the half-built platform (s170-capstone-cka)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Worker node `worker1` carries the label `disk=ssd`'
chk 'Worker node `worker1` carries the label `disk=ssd`' 'echo "$(kubectl get node/worker1 -o jsonpath='\''{.metadata.labels.disk}'\'' 2>/dev/null)" | grep -Eq -- '\''^ssd$'\'''
echo 'Task 2: `web` has all 3 pods Ready'
chk '`web` has all 3 pods Ready' '[ "$(kubectl get pods -n cap-cka -l app=web -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 3 ] && ! kubectl get events -n cap-cka 2>/dev/null | grep -qi "exceeded quota"'
echo 'Task 3: Service `web` has endpoints'
chk 'Service `web` has endpoints' '[ "$(kubectl get endpoints web -n cap-cka -o jsonpath='\''{.subsets[*].addresses[*].ip}'\'' 2>/dev/null | wc -w)" -ge 3 ]'
echo 'Task 4: Claim `data` is Bound and `db` is Ready'
chk 'Claim `data` is Bound and `db` is Ready' '[ "$(kubectl get pvc/data -n cap-cka -o jsonpath='\''{.status.phase}'\'' 2>/dev/null)" = '\''Bound'\'' ] && [ "$(kubectl get pods -n cap-cka -l app=db -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 1 ]'
echo 'Task 5: Only `app=web` pods can reach `db`'
chk 'Only `app=web` pods can reach `db`' 'kubectl exec -n cap-cka webclient -- wget -qO- -T 3 db:80 >/dev/null 2>&1 && ! kubectl exec -n cap-cka intruder -- wget -qO- -T 3 db:80 >/dev/null 2>&1'
echo 'Task 6: `deployer` can patch deployments in `cap-cka` but not delete them'
chk '`deployer` can patch deployments in `cap-cka` but not delete them' '[ "$(kubectl auth can-i patch deployments --as=system:serviceaccount:cap-cka:deployer -n cap-cka 2>/dev/null)" = yes ] && [ "$(kubectl auth can-i delete deployments --as=system:serviceaccount:cap-cka:deployer -n cap-cka 2>/dev/null)" = no ]'
echo 'Task 7: CronJob `backup` runs, and forbids overlap'
chk 'CronJob `backup` runs, and forbids overlap' '[ "$(kubectl get cronjob/backup -n cap-cka -o jsonpath='\''{.spec.suspend}'\'' 2>/dev/null)" = '\''false'\'' ] && [ "$(kubectl get cronjob/backup -n cap-cka -o jsonpath='\''{.spec.concurrencyPolicy}'\'' 2>/dev/null)" = '\''Forbid'\'' ]'
echo 'Task 8: PodDisruptionBudget `web-pdb` keeps at least 2 `web` pods'
chk 'PodDisruptionBudget `web-pdb` keeps at least 2 `web` pods' '[ "$(kubectl get pdb/web-pdb -n cap-cka -o jsonpath='\''{.spec.minAvailable}'\'' 2>/dev/null)" = '\''2'\'' ] && [ "$(kubectl get pdb/web-pdb -n cap-cka -o jsonpath='\''{.spec.selector.matchLabels.app}'\'' 2>/dev/null)" = '\''web'\'' ]'
echo 'Constraint: Keep the ResourceQuota `pods-cap` (raise it only if you must, never delete it) and the `default-deny` policy.'
chk 'Keep the ResourceQuota `pods-cap` (raise it only if you must, never delete it) and the `default-deny` policy.' 'kubectl get resourcequota/pods-cap -n cap-cka >/dev/null 2>&1 && kubectl get networkpolicy/default-deny -n cap-cka >/dev/null 2>&1'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail
