#!/usr/bin/env bash
# KubeDrill lab pack: Incident: capacity crunch (s94-capacity-crunch)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: Admission: the PriorityClass exists'
chk 'Admission: the PriorityClass exists' 'kubectl get priorityclass/gold >/dev/null 2>&1'
echo 'Task 2: Right-size the CPU request'
chk 'Right-size the CPU request' 'echo "$(kubectl get deployment/orders -n prod -o jsonpath='\''{.spec.template.spec.containers[0].resources.requests.cpu}'\'' 2>/dev/null)" | awk -v k=cpu -v mn="" -v mx=500 '\''{v=$1; if(v==""){exit 1} if(k=="cpu"){ if(v ~ /m$/){n=v+0}else{n=v*1000} } else if(k=="mem"){ n=v+0; if(match(v,/[A-Za-z]+$/)){u=substr(v,RSTART); if(u=="Ki")n=n/1024; else if(u=="Gi")n=n*1024; else if(u=="K")n=n*1000/1048576; else if(u=="M")n=n*1000000/1048576; else if(u=="G")n=n*1e9/1048576} else {n=n/1048576} } else {n=v+0} ok=1; if(mn!="" && n<mn+0)ok=0; if(mx!="" && n>mx+0)ok=0; exit ok?0:1}'\'''
echo 'Task 3: Return worker1 to service'
chk 'Return worker1 to service' '[ "$(kubectl get node worker1 -o jsonpath='\''{.spec.unschedulable}'\'' 2>/dev/null)" != "true" ]'
echo 'Task 4: All 4 pods Ready'
chk 'All 4 pods Ready' '[ "$(kubectl get pods -n prod -l app=orders -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 4 ]'
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail
