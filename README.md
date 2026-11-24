# KubeDrill — free, offline Kubernetes practice

> **Live:** [kubedrill.eknathalabs.com](https://kubedrill.eknathalabs.com) · Free · No ads · No signup · No tracking · Works offline
> Part of [EknathaLabs](https://eknathalabs.com)

Practise Kubernetes the way the exams test it: break things, read events, fix them with `kubectl`. KubeDrill runs a **deterministic kubectl simulator in your browser** with auto-checked labs, a timed exam mode and a spaced-repetition quiz — and every lab is also exported as bash scripts for a **real kind cluster**.

## What's inside

| | |
|---|---|
| **Predict first** | In Learn mode, fault labs ask you to commit to a root cause before you touch the terminal; the debrief tells you whether you were right and tracks your accuracy. |
| **Daily challenge** | One fault lab per day (by local date), a streak and a 14-day history. Works offline. |
| **Mock exam bundles** | Fixed CKA/CKAD/CKS sets with weighted tasks, flag-for-review, pass mark 66% and a score-by-domain report. |
| **Real exam environment** | Optional: no checker, no cluster panel, several kube contexts (each task starts in the wrong one, as on the real exam), submit to score. |
| **Real-world failure library** | 5 simulator-only labs (S69–S73): stuck finalizers, NotReady node, kubelet vs swap, a dead admission webhook, expired control-plane certificates. They use `ssh <node> '<cmd>'`, which exists only in the simulator, so they have no kind pack. |
| **Field Guide** | 3 fictional "3 a.m. page" story episodes (chained labs), 5 "Anatomy of an outage" explainers (Reddit 2023, Datadog 2023, OpenAI 2024, Monzo 2017, Zalando 2019: paraphrased from the cited post-mortems and linked to them), and 3 step-through concept animations. |
| **90-second onboarding** | First-run walkthrough with a real mini-terminal; replay from Field Guide. |
| **Workbench layouts** | Split, focus (press `F`) and stacked layouts, remembered per browser. |
| **Terminal that teaches** | Live explanation of the verb, flags and short names as you type, plus did-you-mean for mistyped resources and commands. |
| **Diagram upgrades** | Colour-blind-safe glyphs, per-workload colour stripe, NetworkPolicy shield badge, NotReady node styling. |
| **Docs peek** | Slide-in drawer with commands related to the lab and kubernetes.io pages (in real-exam mode, only kubernetes.io). |
| **Clickable diagram** | Click a pod, service or node to run `describe` in the terminal; hover a service to light up its endpoints. |
| **Learn / Exam modes** | Every lab runs in Learn mode (hints, solution, debrief) or Exam mode (no hints, countdown timer, scored result). |
| **Live cluster diagram** | Nodes and pods colour-coded by health, services with endpoint counts; animates as you fix things. Switch to the text view any time. |
| **Debrief card** | After each lab: root cause, the fix, how to spot it in production and the command pattern to remember. |
| **Interactive labs** | 96 broken-cluster scenarios (beginner → expert) in a split view: instructions · terminal · live cluster state. Hints, solution, **Check** button. |
| **Walkthrough labs** | 15 step-by-step guides for a real cluster |
| **kubectl simulator** | Deployments/ReplicaSets, StatefulSets, DaemonSets, Jobs, PVC binding, Services/Endpoints, HPA, PDB, scheduler (taints, affinity, spread), kubelet failures (ImagePullBackOff, CrashLoop, OOMKilled, probes), ResourceQuota/LimitRange, Pod Security Admission, NetworkPolicy, RBAC `can-i`, CRDs, Gateway API objects, Kustomize, bash-like shell with pipes/heredocs/`vi` |
| **Exam mode** | Timed CKA/CKAD/CKS-style sessions (30/60/120 min), no hints, scored at the end (pass ≥ 66%) |
| **Learning paths** | Ordered roadmap per track: modules → labs → quiz → exam |
| **Quiz** | 358 questions: multiple choice, *type the command*, *order the steps*; Leitner spaced repetition ("due for review") |
| **Modules** | 19 (adds Gateway API, CRDs/Operators, Kustomize, Helm, Pod Security, supply-chain, exam speed) |
| **Visualize** | Step-through animations: control-plane flow, pod lifecycle (incl. failures), rolling update, NetworkPolicy |
| **Errors** | 46-entry error encyclopedia with links to the labs that reproduce them |
| **Tools / cheatsheet** | 9 offline tools, 100+ copy-ready commands, Ctrl+K command palette |
| **Progress** | Saved in your browser only; export / import JSON; streaks |

## Offline

* **PWA** — open the site once; a nav badge shows *Caching n/N → ✓ Works offline*, and an **Install** button appears. After that it works with no network (service worker precaches everything, fonts are self-hosted).
* **Sessions survive reloads** — every lab's simulator state, files, terminal history and hint/solution usage are saved to IndexedDB after each command; a running exam (and its clock) is restored too. “Reset lab” starts over.
* **Safe updates** — a new version never swaps in mid-lab: you get a “new version ready — Reload” toast and apply it when you choose.
* **Storage** — the site requests persistent storage so browsers don't evict it; the *My progress* page shows the status, and nudges you to export a JSON backup every 2 weeks.
* **Single file** — `node build.cjs` → `dist/kubedrill-offline.html` (~1 MB, no server, no network). Works from `file://`.
* No analytics, no counters, no third-party requests of any kind.

## Run on a real cluster (kind)

```bash
cd lab-packs
./kubedrill.sh cluster                # needs Docker + kind
./kubedrill.sh setup s02-imagepull    # break it
kubectl get pods -n shop            # fix it
./kubedrill.sh check s02-imagepull    # same assertions as the browser Check button
```

Packs are generated from the same lab specs (`node tools/gen-packs.cjs`). They are syntax-checked but not every one has been run end-to-end on a real cluster — see `lab-packs/README.md`.

## Develop

```bash
npm i js-yaml                      # only needed to run the tests below
node tests/smoke.js                # simulator smoke test
node tests/labs.test.js            # every lab: fails when broken, passes with its solution
npm i playwright-core              # + a Chrome/Chromium for the browser tests
node tests/e2e.cjs                 # pages, runner, quiz, exam, palette, theme, mobile
node tests/offline.cjs             # service worker offline test
node tests/persist.cjs             # sessions/exam survive reload, offline badge, works offline
node tests/update.cjs              # update toast + Reload flow
node tools/gen-sw.cjs              # regenerate sw.js precache list after adding files
node tools/gen-packs.cjs           # regenerate lab-packs/
node build.cjs && node tests/single-file.cjs
```

Layout: `index.html` (content data + shell) · `assets/js/sim*.js` (simulator) · `assets/js/labs-engine.js` (assertion DSL → JS checker **and** bash generator) · `assets/js/data/labs-sim-*.js` (lab specs) · `lab-ui.js`, `exam.js`, `quiz.js`, `anim.js`, `extras.js` (UI).

Add a lab: append a spec to `assets/js/data/labs-sim-*.js` (setup YAML, tasks with assertions, solution) → `node tests/labs.test.js` must pass → regenerate packs and `sw.js`.

## Honest limits

The simulator is a **teaching model** of Kubernetes (v1.34 behaviour, simplified): no real networking/CNI, kernel, etcd or upgrades — use the kind packs and a real cluster for those, and a paid exam simulator (e.g. killer.sh, bundled with CKA/CKAD/CKS purchases) for the last week. Messages and defaults follow upstream closely but not byte-for-byte.

## License

MIT — see [LICENSE](LICENSE). Bundled: js-yaml (MIT), Inter, Syne, JetBrains Mono (SIL OFL) via @fontsource.

## New in this release
- **S74–S96**: CKS depth (S74–S78), day-2 ops (kubeadm upgrade, node replace, disk pressure), networking (CoreDNS, LoadBalancer, service ladder), scheduler/resources (priority, QoS, right-sizing, HPA vs quota), multi-cluster context labs, and six multi-step incident labs.
- **Field Guide → Flowcharts**: Pending, crash loops, Service unreachable, NotReady node, "autoscaling is not scaling" (incl. Cluster Autoscaler), each ending in a lab.
- **Terminal skins** and text size (saved in your browser). **Diagram**: hover a Service to see animated traffic lines and the Ingress→Service→Pod trace; click a Pending pod for the scheduler's reason.
- **Cautions**: every new lab has a "before you try this on a real cluster" note; risky commands (delete --all, force delete, drain, kubeadm reset, rm -rf, finalizer removal, apply from URL…) show a warning; pasting tokens/private keys into the terminal is blocked. These are guidance, not security controls. Session data lives unencrypted in your browser; use placeholder values only. Only run kind packs on throwaway clusters and check `kubectl config current-context` first.
- **Animated diagram**: pod birth ring, terminating fade, crash shake, controller-chain pulse (kubectl → API → controllers → scheduler → kubelet), scheduler arc when a Pending pod is placed, slide animation when pods move (drain/reschedule), "no fit" shake, per-Service endpoint dots, and traffic dots with blocked ✕ for matching-but-not-Ready pods. A Motion on/off toggle respects your OS setting.
- **Ghost typing**: click any command in a hint, the story or a task and it types itself into the terminal. The token you are typing is highlighted under the terminal.
- **Guided tour**: 🧭 Tour in the lab bar (auto-offered once) and a Guided UI tour in the Field Guide. Skins flicker briefly when switching to green or amber.
- **Unified UI**: refreshed dark tokens, a live cluster hero with proof chips, **Ctrl+K command palette** (labs, flowcharts, outages, pages), Incident/New tags on lab cards, progress ring with a locally generated **share card (PNG)**, task-timeline ticks, and **mobile lab tabs** (Tasks / Terminal / Cluster) on narrow screens.

## UI3 additions
- **Home**: aurora background, scrolling command strip, a "no payment gateway" section with an animated locked/open card, and a "Our promise" strip. `#why` has a generic paywall vs open comparison (no products are named).
- **Settings and privacy** (`#settings`, gear icon): theme, motion, terminal skin and size, default lab mode, backup / restore / clear progress, reset preferences. Everything stays in localStorage.
- **Break-it challenge** (`#break/<seed>`): the seed picks a lab deterministically; countdown, +30 s per hint, best times stored locally, share link carries only the seed.
- **Incident war room**: labs flagged `incident` get a SEV banner, a runbook that ticks as you work, and live service health bars.
- **Cluster canvas**: a "Canvas" tab in the lab cluster panel draws nodes, pods and request dots from the simulator state. It respects the Motion setting.
- Ctrl+K now opens a single palette (pages, modules, errors, commands, labs, flowcharts, outages, settings).
- Fixed: light theme no longer inherits the dark UI2 surface colours.

## UI4 + Lessons
- Home: live hero demo (real simulator, s03-oomkilled), 6-link nav + More menu, staggered reveals, cursor spotlight cards, calmer headline.
- Labs (Learn mode): **blast-radius preview** before risky commands (toggle `Preview` in the lab bar, key `kl.blast`), **shadow expert** after a lab, **draft post-mortem** after incident labs.
- `#learn`: 22 lessons covering all 19 modules, one shape each (why, mental model, anatomy, do it, myths, spot the bug, check, teach back, remember, exam trap, production). Widgets: step player, rollout calculator, QoS checker, matrix, decision tree, runbook. Glossary tooltips. Progress is local (`kl.lessons`).
- Add lessons in `assets/js/data/lessons-a.js` / `lessons-b.js`; `node tests/lessons.test.js` runs every lesson command in the simulator and checks links, quiz answers and field docs.

## Landing page redesign
Split hero (copy + live terminal), three exam path cards (CKA/CKAD/CKS, with progress rings), "how it works" dark band, four stats, tools grid, quieter free-promise band, closing call to action. Styles in `assets/css/home.css`; dark bands use local tokens so they stay dark in the light theme.

## Gap-fill labs (S115–S129) and the design layer
15 more labs (129 total): etcd restore, static pods, CoreDNS Corefile, StatefulSet scale-down, quota × LimitRange, ambassador, config reload, Job limits, Helm rollback, RuntimeClass, encryption at rest, runtime-alert hunt, API-server hardening, manifest review, zero-downtime rollout. Original scenarios, not exam questions.

Design layer: competency tags and a Coverage page (CKA/CKAD/CKS), constraints, traps, hidden stage 2 on four labs, difficulty ladders, speed rounds, checker reasons, "why this works", dead-end nudges, hint costs and weak spots, and seeded variants (9 labs × 3 versions, also used by the daily challenge). Variants change names and values, not the fault class.

Honest limits: etcd restore, static pods, Helm (one toy chart), encryption config and Falco output are scripted models, marked on the Fidelity page. Skills that need a real cluster (HA, CNI, mTLS, host OS, AppArmor, upgrades) are listed as not simulable on the Coverage page. S115, S116, S123–S127 are simulator-only (no kind pack).

## Exam-curriculum labs (S97–S114)
18 new labs (6 CKA, 6 CKAD, 6 CKS; 114 total) filling gaps against the current public CNCF curricula: PV reclaim/expansion, draining unmanaged pods, NoExecute + tolerationSeconds, HPA requests, ClusterRole reuse, Gateway API HTTPRoute, Job/CronJob policy, startup probes, envFrom/Secret volumes, rollout strategy, deprecated apiVersions, seccomp/securityContext, default-deny NetworkPolicy, secrets as files, audit-log hunting, over-broad RBAC, Pod Security staged rollout. They are original scenarios built from the official competency lists — not exam questions. Checks are state-based (the simulator has no CSR, RuntimeClass, static pods, or Falco/audit-policy files).

## Pro layer: time machine, explainers, exam realism, terminal
New files: `assets/js/pro-term.js`, `pro-explain.js`, `pro-fidelity.js`, `assets/css/pro.css`, `tests/pro.cjs`.
- **Cluster time machine** (Learn mode): every state-changing command snapshots the whole simulated cluster and your files. Scrub the timeline, preview what a rewind would bring back, remove or revert, rewind, and return. `Ctrl-Z` undoes the last change. After finishing a lab, compare your command path with the reference solution.
- **Explain** (Learn mode): *Why is it Pending?* shows the scheduler filter funnel per node (name, cordon, selector/affinity, taints, CPU, memory, anti-affinity), the winner, and the fixes. *Can A reach B?* traces DNS, Service port, endpoints, egress and ingress NetworkPolicy and names the policy that blocks.
- **Alert-first labs**: incident and fault labs open on a pager card (firing alerts, 5xx graph, availability, live logs and events, acknowledge, time to resolve). The story is collapsed behind it.
- **Predict-the-output**: toggle 🔮 Predict; before a state-changing command you guess how many pods will be Ready 30 s later, then see the real result and why.
- **Terminal**: Tab completes verbs, kinds, object names, namespaces, flags and `-o` values from the live cluster; Ctrl-R history search; Ctrl-U/W/K/A/E line editing; `$do` and `$now` like the exam image; unquoted `$var` now word-splits like bash. A touch key bar (Tab, arrows, `|`, `~`, `/`, Ctrl-C/R/Z, Enter) appears on phones.
- **Exam realism**: curriculum-weighted mocks (official CNCF domain weights), question navigator with attempted/flagged status, domain report with exam weights, and a speed coach (alias `k`, `$do`, imperative commands, `explain`, unattempted tasks). The time machine, explainers and alerts are disabled during exams.
- **Fidelity**: every lab shows Exact / Modelled / Scripted; `#fidelity` lists what the simulator covers and what it does not model.

## Incidents, worked examples, YAML repair (S130–S146) and learning features
- **S130–S135** CSR/PKI and PriorityClass/context labs. **S136–S139** multi-fault incidents (3–4 stacked faults behind one symptom, a "do not touch" constraint). **S140–S142** worked examples (watch the expert's commands, then repeat the pattern). **S143–S146** YAML repair (tab, indentation, removed apiVersion, selector mismatch). 146 labs after that block.
- **Simulator:** CertificateSigningRequest + `kubectl certificate`, scripted `openssl`, `config set-credentials`, certificate-derived identity for RBAC (`--as-group`), PriorityClass immutability and `preemptionPolicy: Never`, DNS needs egress to CoreDNS, client-side YAML validation (removed apiVersions, misplaced fields).
- **Learning layer** (`assets/js/learn-features.js`): worked-example panel, fading hints (Nudge, Approach, Answer; labs that needed the Answer come back as "Revisit"), optional "Predict, then run", and "Compare solutions" after a pass. All local.
- **Conformance:** `node tools/conformance.cjs` runs every pack's `setup.sh` / `check.sh` / `solution.sh` under real bash against the simulator and compares with the JS checks. `tools/conformance-real.sh` does the same on a real kind cluster (not run in CI here).

## Content-gap labs, mobile keys, readiness and source credits (S147–S155) — 155 labs in total
- **S147–S148** Gateway API: header match plus a 90/10 weighted split, and a cross-namespace backend that needs a `ReferenceGrant`. **S149** a custom resource rejected by its CRD schema (the simulator now validates required, type, enum, minimum and unknown fields). **S150** Helm values and `--reuse-values`. **S151** write an audit policy and enable it on the API server. **S152** AppArmor field plus profile text. **S153** fix a Falco rule. **S154** read a Trivy report. **S155** Kubernetes version-skew policy.
- Audit policy, AppArmor and Falco are checked as **file content**; the simulator runs no API server, kernel module or Falco engine. Those labs say so, and the Fidelity page marks them Scripted.
- **Mobile terminal:** the key bar gained cursor keys, more symbols and one-tap flag snippets (`-n`, `-A`, `-o yaml`, `$do`), and pins above the on-screen keyboard. Tested with touch emulation only, not on real phone keyboards.
- **Why did my check fail:** every failing check suggests the command that shows what it looked at. **Completion card:** a PNG drawn in your browser (nothing is uploaded).
- **Readiness range** (Coverage and Exam result pages): the range of your last timed exam scores per track, never a single number or a pass prediction, and always with a reminder to practise more before the real exam. It needs at least two timed exams.
- **Source credits:** each lab lists the official docs for its skills (`assets/js/data/sources.js`). Run `node tools/check-links.cjs` (needs network) to test every link.

## Trustworthy checking and capstones (S156–S172) — 172 labs in total
- **Check the outcome, not the method**: assertions inspect resulting state (or run a `probe` / look for an `event`), so any valid route passes; 47 alternative-solution cases are tested.
- **Over-fix detection**: the checker derives what the reference solution deletes and flags removal of anything else protective (NetworkPolicy, quota, RBAC, Secrets, PVCs…).
- **Durability checks**: a passing state is cloned, controller-owned pods are deleted and the Deployment restarted; a fix that does not survive is reported as not durable (opt-out `durable:false`).
- **Mutation testing** (`node tools/mutation.cjs --strict`): drops each solution step and fails if the lab still passes; `lab-lint.cjs` finds assertions that need names the learner is never told.
- **Red herrings**: 12 labs add look-alike broken objects in namespace `kd-noise`; deleting them is an over-fix and the result card explains the decoys.
- **Capstones S170 (CKA), S171 (CKAD), S172 (CKS)**: 8–10 weighted tasks, partial credit, pass mark 66 of 100.
- **Documentation lookup S167–S169**: `kubectl explain` (about 25 kinds) used to find and build fields; vi editing is a stub.
- Honest limits: ValidatingAdmissionPolicy supports a CEL subset and Deny only; `kubectl debug` is non-interactive; the real-cluster conformance pack has not been run on a real cluster by me.

## About exam practice (read this)
KubeDrill is independent: it is not affiliated with, endorsed by or sponsored by The Linux Foundation, the CNCF or the Kubernetes project. CKA, CKAD, CKS and Kubernetes are trademarks of their owners. The labs and mock exams are original, use no real exam questions, and run in a simulator, so task style, difficulty and scoring differ from the real exams. A score here is practice feedback, not a prediction. The exam's Kubernetes version changes: set the version you are practising for on the Labs page and check the official exam page.

## Practice tools added in this release
- **Full mock exam** (Exam page): 16 tasks, 120 minutes, drawn by the official domain weights, fresh variants each attempt, per-task time in the review. Tasks are lab-sized, so time pressure is harsher than the real exam.
- **Drills** (`#drills`): 35 timed command drills and 25 `kubectl explain` doc races, checked on the outcome.
- **Error decoder** (`#decode`): 61 rules, runs locally. It points to likely causes; it does not see your cluster.
- **Teach-back** on the result card: write the root cause in your own words before the answer is shown.
- **Version-aware labs**: set the Kubernetes version you are practising for; labs using newer features are flagged. Feature stages come from release notes and KEPs, so check the version your exam actually uses.
- **Variants**: 308 auto-generated variants rename the namespace and objects only; hand-written variants change the scenario.
- Quality gates: `node tools/teach-lint.cjs --strict` (every lab now has a trap or a "why"; the ratchet is at 0 so it cannot slip back), `tools/mutation.cjs --strict`, `tests/*.test.js`.

## Added after that: traps, replay, Read & diff
- **Traps and "why"**: all 172 labs now name the tempting wrong move and the reasoning behind the fix. They live in `assets/js/data/traps-*.js`; `tests/traps.test.js` checks each note and runs every "prove it" command after the lab's solution.
- **Mistake replay**: the result card shows your command trail next to the reference path, marking each step as looked, changed, failed or repeated. It is computed locally from the commands you typed.
- **Read & diff** (`#reading`): 40 reading cases built from real simulator output (find the clue line, then name the cause) and 16 manifest diffs (find the breaking line, then say why). Eight diffs were applied in the simulator in both versions; eight are faults or behaviours (including NetworkPolicy AND-vs-OR selectors, probes and securityContext) that a real API server rejects or that only show in traffic, which the simulator does not reproduce, and the page says so.
- Tests: `tests/traps.test.js`, `tests/replay.test.js`, `tests/reading.test.js`, and browser tests `tests/replay-ui.cjs`, `tests/reading-ui.cjs`.

## More labs, second faults and reading cases (S173–S197) — 197 labs in total
- **25 new labs, all `simOnly`**: S173–S181 CKA control plane (scheduler, controller-manager and apiserver manifest faults, kube-proxy mode, missing CNI config, expired join token, metrics-server, no default StorageClass, etcd NOSPACE), S182–S189 CKAD (multi-container logs, events triage, removed APIs, labels at scale, named targetPort, adapter sidecar, kustomize overlay with generators, helm `--reuse-values`), S190–S197 CKS (kubelet hardening, kube-bench file modes, registry admission policy, seccomp Localhost, AppArmor load, two Falco rules, secret in a ConfigMap).
- **Honest limits**: the control-plane, file-mode, AppArmor and Falco labs are scripted models (see the Fidelity page). None of them is mirrored in the kind packs or has been run on a real cluster. mTLS/Cilium was not built because the simulator cannot model it. S180 covers "no default StorageClass" only, not "two defaults".
- **Second-fault variants**: 12 hand-written variants in `assets/js/data/variants-fault2.js` change the fault itself (for example a bad readiness probe behind a Service with no endpoints). Do not regenerate over this file.
- **Read & diff**: 40 reading cases and 16 diffs.

## S198–S216, visuals and numbered full mocks — 216 labs
- **10 new labs, all `simOnly`**: topology spread constraints, local-volume node affinity, hostPort conflicts, requests above limits, `imagePullPolicy: Never`, downward-API field paths, a suspended Job, a read-only root filesystem, an immutable selector and an immutable Pod field. They needed new simulator rules, listed on the Fidelity page.
- **Full mocks**: besides the random full mock there are now fixed sets (CKA 1–3, CKAD 1–3, CKS 1–2: 16 tasks each, the same tasks and variant names every time, no task shared between numbers) and a hard set per track. They follow the same domain weights and carry the same "practice, not prediction" notice.
- **S208–S211, all `simOnly`**: StatefulSet `podManagementPolicy` (immutable field, `--cascade=orphan`, adopting orphaned pods), Service `externalTrafficPolicy` and session affinity validation, digest-pinned images (a malformed digest gives `InvalidImageName`), and pod `dnsConfig` / `ndots` in `/etc/resolv.conf`. The simulator gained those rules plus `--cascade=orphan`.
- **S212–S216, all `simOnly`**: RBAC `bind` (the API server refuses to grant permissions the user does not hold, now enforced for `--as` and certificate identities on Roles and bindings), a StatefulSet canary with `partition`, finishing a partitioned rollout, renewing only the admin client certificate and refreshing the kubeconfig (`kubeadm certs renew admin.conf`, `scp`), and a three-fault game day. StatefulSets now track revisions (`controller-revision-hash`, `updateRevision`) and roll out highest ordinal first, one pod at a time, only while every pod is Ready; `kubectl rollout status sts` gives the StatefulSet messages.
- **Visuals** (`assets/js/visuals.js`, `touches.js`, `assets/css/visuals.css`; CSS/SVG only, offline, off under reduced motion or the Motion toggle, and every fact is also text): a scheduler and cluster panel in learn-mode labs (node CPU/memory requests, taints, control-plane heartbeat, etcd size, PVC to PV links, quota meters, probe state), pod lifecycle pills in the terminal after commands that change pods, revision colour on diagram pods, progress rings on the track filters and path tabs, a mastery map and streak flame on the Progress page, hint slide-in, a focus slider on reading diffs, a typing trail in command drills, a theme-switch sweep, an offline badge pulse, a 150 ms page fade, and an amber (under 20 minutes) and red (under 5 minutes) exam timer that no longer blinks.
- **Not built**: image-signature admission, skeleton shimmer (nothing loads slowly offline), a CKS Beginner mock (too few Beginner CKS tasks), real outage write-ups beyond the ones already cited (each needs a verified primary source), a run against a real cluster, a throttle test on a real phone, and Gateway API listener or `allowedRoutes` behaviour in the simulator (S226 is checked on the objects you write, not on traffic).

## S217–S228, flashcards, animated touches, level mocks and the Trainers page — 228 labs in total

- **New labs, all `simOnly`**: S217 NetworkPolicy peers (selectors in one list item AND, in two items OR), S218 a Deployment whose ServiceAccount does not exist plus a least-privilege RoleBinding, S219 `runAsNonRoot` refusing a root image, S220 Ingress `Exact` vs `Prefix` and a wrong backend port, S221 an inventory report with `custom-columns`, `--sort-by` and `jsonpath`. Each has a debrief, a trap card, competency tags, and passes lab-lint, teach-lint and the mutation check where it applies (S221 writes files by redirect, which the mutation tool does not count).
- **Flashcards** (`assets/js/flash.js`): a mode on the Quiz page with a card that flips (Space or Enter), grades 1 or 2 into the same spaced-repetition record as the quiz. Reduced motion swaps the flip for a fade.
- **Animated touches** (`assets/js/visuals.js`, `touches.js`): request journey strip after every command, NetworkPolicy traffic dots on hover or focus of a shielded pod (green dots for allowed, dashed red with a cross for blocked), hint cost meter, tick pop and pulse on a fixed object, rollout wave on the diagram. All CSS or SVG, 400 ms or less, transform and opacity only, off with `prefers-reduced-motion` or the Motion toggle. None of them hide or soften a failed check.
- **More content**: 3 walkthrough labs (13–15), 44 quiz questions (multiple choice, type-the-command, order-the-steps; 358 in total), 6 Visualize scenes, also listed as Field Guide explainers (scheduler, Service endpoints, RBAC, NetworkPolicy peers, StatefulSet partition, ndots), 2 Field Guide flowcharts (Forbidden, pods cannot reach each other) and a fourth fictional story. Competency coverage grows for `ckad-netpol`, `ckad-sa`, `cka-ingress`, `ckad-jsonpath`, `cks-psa`, `cks-priv`, `cks-rbac`.
- **Mocks by difficulty**: CKA and CKAD Beginner, Intermediate and Advanced mocks, and CKS Intermediate and Advanced. Fixed task sets drawn from labs at that level, 8–10 tasks.
- **S222–S228, all `simOnly`**: S222 audit-policy rule order (first match wins, Secrets stay at Metadata), S223 kubelet config hardening (anonymous auth, `AlwaysAllow`, read-only port), S224 Helm release drift after `kubectl scale`, S225 a Kustomize patch whose target name matches nothing, S226 migrating an Ingress to a Gateway and HTTPRoute, S227 a five-fault game day (policy, Service selector, memory request, missing Secret, bad image tag), S228 a four-gap CKS game day (Pod Security `restricted`, an admin RoleBinding for `default`, default-deny, an unpinned image). Mutation check: 0 survivors.
- **Trainers page** (`#trainers`, More menu; `assets/js/trainers.js`, `data/trainers-data.js`): *Weak spots* ranks quiz topics and competencies from your own records and runs a six-question session plus one suggested lab; *Explain the error* has 22 error messages with four readings each, misses come back first; *Docs search* has 14 tasks asking which documentation section holds the answer (page titles can move, so search by keyword if one has); *Study plan* builds a day-by-day schedule from exam date, hours per week and experience, six study days a week, mocks in the final days, a rest day before the exam, tick boxes, copy-as-text and print. The plan is a schedule, not a prediction of any result. Everything stays on this device.
- **Motion under load**: `tests/throttle.cjs` runs the lab cues with Chrome CPU throttling at 1x, 4x and 6x and prints worst frame gaps while the cues play (17 ms in each run on the build machine, a headless desktop Chrome, not a phone). It also checks that nothing keeps looping and that no cue runs with Motion off.
- **Share card**: `tools/gen-og.cjs` regenerates `icons/og.png` from the live lab and question counts, so the card cannot go stale again (it said 155 labs).
