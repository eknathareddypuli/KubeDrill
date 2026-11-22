# Read a Trivy report: what must be fixed first

**Track:** CKS · **Level:** Intermediate · **Time:** 10 min · **Namespace:** `default`

`/home/student/trivy-report.txt` is a scan of four images (columns: IMAGE PACKAGE CVE SEVERITY FIXED, `-` means no fixed version exists yet). Write `/home/student/critical-images.txt` with the images that have at least one CRITICAL finding (one per line, sorted, no duplicates) and `/home/student/fixable.txt` with the number of findings, of any severity, that have a fixed version available.

## Tasks

1. **critical-images.txt lists the images with a CRITICAL finding** — 
2. **fixable.txt holds how many findings have a fix available** — 

## Run

```bash
./setup.sh   # create the broken environment
# ...fix it with kubectl...
./check.sh   # grade your work
./reset.sh   # remove everything
```

## Hints

<details><summary>Task 1 hints</summary>

1. `grep CRITICAL file` keeps the lines; the image is column 1.
2. `awk '{print $1}'`, then `sort -u`, then redirect with `>`.
</details>

<details><summary>Task 2 hints</summary>

1. The header line is not a finding. A fix exists when the last column is not `-`.
2. `grep -v ' -$' file` drops the unfixable lines. Then count only real findings: `grep -c CVE-` (the header and blank lines have no CVE id).
</details>

<details><summary>Solution</summary>

```bash
grep CRITICAL /home/student/trivy-report.txt | awk '{print $1}' | sort -u > /home/student/critical-images.txt
grep -v ' -$' /home/student/trivy-report.txt | grep -c CVE- > /home/student/fixable.txt
```
</details>
