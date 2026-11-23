#!/usr/bin/env bash
# KubeDrill lab pack: CAPSTONE (CKAD): ship the orders service (s171-capstone-ckad)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: `orders` image is a tag that exists'
chk '`orders` image is a tag that exists' 'echo "$(kubectl get deployment/orders -n cap-ckad -o jsonpath='\''{.spec.template.spec.containers[0].image}'\'' 2>/dev/null)" | grep -Eq -- '\''^nginx:1\.25$'\'''
echo 'Task 2: The ConfigMap key reference resolves'
chk 'The ConfigMap key reference resolves' '[ "$(kubectl get pods -n cap-ckad -l app=orders --no-headers 2>/dev/null | wc -l)" -ge 2 ] && [ "$(kubectl get pods -n cap-ckad -l app=orders -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 1 ]'
echo 'Task 3: The Secret key reference resolves'
chk 'The Secret key reference resolves' 'echo "$(kubectl get deployment/orders -n cap-ckad -o jsonpath='\''{.spec.template.spec.containers[0].env[1].valueFrom.secretKeyRef.key}'\'' 2>/dev/null)" | grep -Eq -- '\''^password$'\'''
echo 'Task 4: The readiness probe checks the port the app listens on'
chk 'The readiness probe checks the port the app listens on' '[ "$(kubectl get deployment/orders -n cap-ckad -o jsonpath='\''{.spec.template.spec.containers[0].readinessProbe.httpGet.port}'\'' 2>/dev/null)" = '\''80'\'' ]'
echo 'Task 5: Both `orders` pods are Ready'
chk 'Both `orders` pods are Ready' '[ "$(kubectl get pods -n cap-ckad -l app=orders -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 2 ]'
echo 'Task 6: Service `orders` answers from `tester`'
chk 'Service `orders` answers from `tester`' 'kubectl exec -n cap-ckad tester -- wget -qO- -T 3 orders:80 >/dev/null 2>&1'
echo 'Task 7: Job `migrate` completed'
chk 'Job `migrate` completed' '[ "$(kubectl get job/migrate -n cap-ckad -o jsonpath='\''{.status.succeeded}'\'' 2>/dev/null)" = '\''1'\'' ]'
echo 'Task 8: CronJob `report` runs hourly and forbids overlap'
chk 'CronJob `report` runs hourly and forbids overlap' '[ "$(kubectl get cronjob/report -n cap-ckad -o jsonpath='\''{.spec.schedule}'\'' 2>/dev/null)" = '\''0 * * * *'\'' ] && [ "$(kubectl get cronjob/report -n cap-ckad -o jsonpath='\''{.spec.concurrencyPolicy}'\'' 2>/dev/null)" = '\''Forbid'\'' ]'
echo 'Task 9: HPA `orders` scales 2–5 at 70% CPU'
chk 'HPA `orders` scales 2–5 at 70% CPU' '[ "$(kubectl get hpa/orders -n cap-ckad -o jsonpath='\''{.spec.minReplicas}'\'' 2>/dev/null)" = '\''2'\'' ] && [ "$(kubectl get hpa/orders -n cap-ckad -o jsonpath='\''{.spec.maxReplicas}'\'' 2>/dev/null)" = '\''5'\'' ]'
echo 'Task 10: Ingress `orders` routes `orders.example.com` / to Service `orders:80`'
chk 'Ingress `orders` routes `orders.example.com` / to Service `orders:80`' '[ "$(kubectl get ingress/orders -n cap-ckad -o jsonpath='\''{.spec.rules[0].host}'\'' 2>/dev/null)" = '\''orders.example.com'\'' ] && [ "$(kubectl get ingress/orders -n cap-ckad -o jsonpath='\''{.spec.rules[0].http.paths[0].backend.service.name}'\'' 2>/dev/null)" = '\''orders'\'' ] && [ "$(kubectl get ingress/orders -n cap-ckad -o jsonpath='\''{.spec.rules[0].http.paths[0].backend.service.port.number}'\'' 2>/dev/null)" = '\''80'\'' ]'
echo 'Constraint: Keep the CPU/memory requests on `orders` and the ConfigMap `orders-cfg` key `PORT=8080`.'
chk 'Keep the CPU/memory requests on `orders` and the ConfigMap `orders-cfg` key `PORT=8080`.' '[ "$(kubectl get cm/orders-cfg -n cap-ckad -o jsonpath='\''{.data.PORT}'\'' 2>/dev/null)" = '\''8080'\'' ] && echo "$(kubectl get deployment/orders -n cap-ckad -o jsonpath='\''{.spec.template.spec.containers[0].resources.requests.cpu}'\'' 2>/dev/null)" | awk -v k=cpu -v mn=50 -v mx="" '\''{v=$1; if(v==""){exit 1} if(k=="cpu"){ if(v ~ /m$/){n=v+0}else{n=v*1000} } else if(k=="mem"){ n=v+0; if(match(v,/[A-Za-z]+$/)){u=substr(v,RSTART); if(u=="Ki")n=n/1024; else if(u=="Gi")n=n*1024; else if(u=="K")n=n*1000/1048576; else if(u=="M")n=n*1000000/1048576; else if(u=="G")n=n*1e9/1048576} else {n=n/1048576} } else {n=v+0} ok=1; if(mn!="" && n<mn+0)ok=0; if(mx!="" && n>mx+0)ok=0; exit ok?0:1}'\'''
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail
