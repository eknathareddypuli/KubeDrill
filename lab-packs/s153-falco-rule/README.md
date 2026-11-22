# Falco: fix a noisy, uninformative shell rule

**Track:** CKS · **Level:** Advanced · **Time:** 12 min · **Namespace:** `default`

The rule in `/home/student/falco_rules.local.yaml` (on a real node it lives in `/etc/falco/`) fires for every `bash` on the host and its alert says nothing about where it happened. Fix it: it should only fire when a shell process is **spawned inside a container**, the output must include the container id and the full command line, and the priority must be `WARNING` or higher.

## Tasks

1. **The condition requires a spawned process inside a container, for a shell** — 
2. **The alert names the container and the command line, with priority WARNING or higher** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `condition:` must mention `spawned_process` and `container`.
2. Shell names: `proc.name in (bash, sh, zsh)`.
</details>

<details><summary>Task 2 hints</summary>

1. Output fields: `%container.id`, `%proc.cmdline`, `%user.name`.
2. Priorities, low to high: DEBUG INFO NOTICE WARNING ERROR CRITICAL ALERT EMERGENCY.
</details>

<details><summary>Solution</summary>

```bash
cat > /home/student/falco_rules.local.yaml <<'EOF'
- rule: Shell in container
  desc: A shell was started inside a container
  condition: spawned_process and container and proc.name in (bash, sh, zsh)
  output: shell in container (user=%user.name container=%container.id cmd=%proc.cmdline)
  priority: WARNING
EOF
```
</details>
