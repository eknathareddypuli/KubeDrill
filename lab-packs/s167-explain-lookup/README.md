# Documentation lookup: find the field in kubectl explain

**Track:** CKA, CKAD, CKS · **Level:** Beginner · **Time:** 10 min · **Namespace:** `default`

In the exam you may use kubernetes.io/docs, and `kubectl explain` is faster. Without guessing, answer from the explain output. Write `/home/student/answers.txt` with exactly four lines `q1=...` to `q4=...`:
1. the field of a Deployment strategy's rollingUpdate that limits EXTRA pods during an update;
2. the allowed values of a CronJob's `concurrencyPolicy`, comma separated, in the order explain lists them;
3. the data type of `spec.terminationGracePeriodSeconds` of a Pod;
4. the Service `externalTrafficPolicy` value that keeps the client source IP.

## Tasks

1. **Questions 1 and 2 are answered** — 
2. **Questions 3 and 4 are answered** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl explain deployment.spec.strategy.rollingUpdate`
2. `kubectl explain cronjob.spec.concurrencyPolicy`
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl explain pod.spec.terminationGracePeriodSeconds`
2. `kubectl explain service.spec.externalTrafficPolicy`
</details>

<details><summary>Solution</summary>

```bash
kubectl explain deployment.spec.strategy.rollingUpdate
kubectl explain cronjob.spec.concurrencyPolicy
printf 'q1=maxSurge\nq2=Allow,Forbid,Replace\nq3=integer\nq4=Local\n' > /home/student/answers.txt
```
</details>
