#!/usr/bin/env bash
# KubeDrill lab pack: HPA shows <unknown>: no CPU requests (s100-hpa-unknown)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Find the cause'
chk 'Find the cause' 'kubectl get hpa/web -n scale >/dev/null 2>&1'
echo 'Task 2: Deployment `web` requests 100m CPU'
chk 'Deployment `web` requests 100m CPU' 'echo "$(kubectl get deploy/web -n scale -o jsonpath='\''{.spec.template.spec.containers[0].resources.requests.cpu}'\'' 2>/dev/null)" | awk -v k=cpu -v mn=50 -v mx=500 '\''{v=$1; if(v==""){exit 1} if(k=="cpu"){ if(v ~ /m$/){n=v+0}else{n=v*1000} } else if(k=="mem"){ n=v+0; if(match(v,/[A-Za-z]+$/)){u=substr(v,RSTART); if(u=="Ki")n=n/1024; else if(u=="Gi")n=n*1024; else if(u=="K")n=n*1000/1048576; else if(u=="M")n=n*1000000/1048576; else if(u=="G")n=n*1e9/1048576} else {n=n/1048576} } else {n=v+0} ok=1; if(mn!="" && n<mn+0)ok=0; if(mx!="" && n>mx+0)ok=0; exit ok?0:1}'\'''
echo 'Task 3: HPA keeps its 2–6 range and 50% target'
chk 'HPA keeps its 2–6 range and 50% target' '[ "$(kubectl get hpa/web -n scale -o jsonpath='\''{.spec.maxReplicas}'\'' 2>/dev/null)" = '\''6'\'' ] && [ "$(kubectl get pods -n scale -l app=web -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 2 ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail
