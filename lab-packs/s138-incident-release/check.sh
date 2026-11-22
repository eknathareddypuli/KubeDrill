#!/usr/bin/env bash
# KubeDrill lab pack: INCIDENT: release 42 broke `api` and `worker` (s138-incident-release)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
pass=0; fail=0
chk() { # $1=task title, rest = condition
  local title="$1"; shift
  if eval "$@"; then echo "  ✔ $title"; pass=$((pass+1)); else echo "  ✘ $title"; fail=$((fail+1)); fi
}
sleep 1
echo 'Task 1: `api`: pods start (no CreateContainerConfigError)'
chk '`api`: pods start (no CreateContainerConfigError)' '[ "$(kubectl get deploy/api -n inc-api -o jsonpath='\''{.spec.template.spec.containers[0].env[0].valueFrom.secretKeyRef.key}'\'' 2>/dev/null)" = '\''password'\'' ]'
echo 'Task 2: `api`: both pods Ready (the readiness probe checks the right port)'
chk '`api`: both pods Ready (the readiness probe checks the right port)' '[ "$(kubectl get pods -n inc-api -l app=api -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 2 ]'
echo 'Task 3: `worker`: stops being OOMKilled and runs steadily'
chk '`worker`: stops being OOMKilled and runs steadily' 'echo "$(kubectl get deploy/worker -n inc-api -o jsonpath='\''{.spec.template.spec.containers[0].resources.limits.memory}'\'' 2>/dev/null)" | awk -v k=mem -v mn=130 -v mx="" '\''{v=$1; if(v==""){exit 1} if(k=="cpu"){ if(v ~ /m$/){n=v+0}else{n=v*1000} } else if(k=="mem"){ n=v+0; if(match(v,/[A-Za-z]+$/)){u=substr(v,RSTART); if(u=="Ki")n=n/1024; else if(u=="Gi")n=n*1024; else if(u=="K")n=n*1000/1048576; else if(u=="M")n=n*1000000/1048576; else if(u=="G")n=n*1e9/1048576} else {n=n/1048576} } else {n=v+0} ok=1; if(mn!="" && n<mn+0)ok=0; if(mx!="" && n>mx+0)ok=0; exit ok?0:1}'\'' && [ "$(kubectl get pods -n inc-api -l app=worker -o jsonpath='\''{range .items[*]}{.status.phase}{" "}{.status.containerStatuses[0].ready}{"\n"}{end}'\'' 2>/dev/null | grep -c "Running true")" -ge 1 ]'
echo 'Constraint: Keep the `api` readinessProbe and the `worker` memory limit (fix their values).'
chk 'Keep the `api` readinessProbe and the `worker` memory limit (fix their values).' 'echo "$(kubectl get deploy/api -n inc-api -o jsonpath='\''{.spec.template.spec.containers[0].readinessProbe.httpGet.path}'\'' 2>/dev/null)" | grep -Eq -- '\''.+'\'' && echo "$(kubectl get deploy/worker -n inc-api -o jsonpath='\''{.spec.template.spec.containers[0].resources.limits.memory}'\'' 2>/dev/null)" | grep -Eq -- '\''.+'\'''
echo; echo "Result: $pass passed, $fail failed"; [ "$fail" -eq 0 ] && echo "🎉 Lab complete!"; exit $fail
