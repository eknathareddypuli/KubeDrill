# Documentation lookup: what is required, and what is allowed

**Track:** CKA, CKAD · **Level:** Intermediate · **Time:** 12 min · **Namespace:** `default`

Write `/home/student/lookup.txt` with four lines, answered from `kubectl explain` (the output marks required fields with `-required-`):
`a=` the three REQUIRED fields of an entry in a pod's `topologySpreadConstraints`, alphabetical, comma separated;
`b=` the allowed values of `whenUnsatisfiable`, comma separated, in the order explain lists them;
`c=` the allowed values of a ValidatingAdmissionPolicy's `failurePolicy`, comma separated, in the order explain lists them;
`d=` the name of the StorageClass field that allows growing a bound claim.

## Tasks

1. **`a` and `b` are right** — 
2. **`c` and `d` are right** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `kubectl explain pod.spec.topologySpreadConstraints`
2. Look for `-required-` next to each field.
</details>

<details><summary>Task 2 hints</summary>

1. `kubectl explain validatingadmissionpolicy.spec.failurePolicy`
2. `kubectl explain storageclass --recursive`
</details>

<details><summary>Solution</summary>

```bash
kubectl explain pod.spec.topologySpreadConstraints
printf 'a=maxSkew,topologyKey,whenUnsatisfiable\nb=DoNotSchedule,ScheduleAnyway\nc=Fail,Ignore\nd=allowVolumeExpansion\n' > /home/student/lookup.txt
```
</details>
