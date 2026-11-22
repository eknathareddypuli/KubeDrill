#!/usr/bin/env bash
# KubeDrill lab pack: Read the audit log: who touched the secret? (s112-audit-hunt)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s112-audit-hunt. Try the lab first.
grep prod-db $HOME/audit.log | grep code=200 | awk '{print $1}' > $HOME/answer.txt
grep -c code=403 $HOME/audit.log > $HOME/denied.txt
cat $HOME/answer.txt $HOME/denied.txt
