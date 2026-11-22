#!/usr/bin/env bash
# KubeDrill lab pack: Back up etcd with a snapshot (s63-etcd-backup)
# Generated from the same spec that powers the in-browser lab. Requires: kubectl + a local cluster (e.g. kind create cluster).
set -uo pipefail
# Spoiler: the reference solution for s63-etcd-backup. Try the lab first.
etcdctl snapshot save $HOME/etcd-backup.db
etcdctl snapshot status $HOME/etcd-backup.db
