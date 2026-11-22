#!/usr/bin/env bash
# KubeDrill lab pack: Read a Trivy report: what must be fixed first (s154-trivy-report)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s154-trivy-report. Try the lab first.
grep CRITICAL $HOME/trivy-report.txt | awk '{print $1}' | sort -u > $HOME/critical-images.txt
grep -v ' -$' $HOME/trivy-report.txt | grep -c CVE- > $HOME/fixable.txt
