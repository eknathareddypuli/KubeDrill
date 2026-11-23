// Mistake replay: the classifier and the analysis, without a browser.
global.KL = {}; require('../assets/js/replay.js'); const R = KL.replay; let bad = 0;
const eq = (a, b, m) => { if (a !== b) { bad++; console.log('✘', m, '=>', JSON.stringify(a), 'expected', JSON.stringify(b)); } };
const looks = ['kubectl get pods -n shop', 'k describe pod web-1 -n shop', 'kubectl -n shop logs web-1', 'kubectl get cm app -o yaml', 'kubectl rollout status deploy/web', 'kubectl rollout history deploy/web -n rel', 'kubectl auth can-i list nodes --as=system:serviceaccount:a:b', 'kubectl config current-context', 'kubectl explain pod.spec', 'ssh worker1 \'journalctl -u kubelet\'', 'grep -c code=403 audit.log', 'helm history shop -n s', 'etcdctl snapshot status /b.db', 'kubectl create deploy x --image=nginx --dry-run=client -o yaml', 'kubectl --context staging get pods', 'ls /etc/kubernetes/manifests', 'df -h', 'kubeadm certs check-expiration'];
const changes = ['kubectl delete pod web-1', 'kubectl apply -f x.yaml', 'k scale deploy web --replicas=3 -n shop', 'kubectl patch svc a -p \'{}\'', 'kubectl set image deploy/web web=nginx:1.25', 'ssh worker1 \'sudo swapoff -a\'', 'kubectl get pods > pods.txt', 'sed -i s/a/b/ f.yaml', 'echo x > /home/student/finding.txt', 'kubectl get pods && kubectl delete pod x', 'kubectl run p --image=nginx', 'helm rollback shop 1', 'kubectl create deployment x --image=nginx --dry-run=client -o yaml > d.yaml'];
looks.forEach(l => eq(R.kind(l), 'look', 'look: ' + l)); changes.forEach(l => eq(R.kind(l), 'change', 'change: ' + l));
const sol = ['kubectl set image deploy/web web=nginx:1.25 -n shop', 'kubectl get pods -n shop'];
let a = R.analyse([{ line: 'kubectl delete pod web-1 -n shop', code: 0, t: 1000 }, { line: 'kubectl get pods -n shop', code: 0, t: 2000 }, { line: 'kubectl get pods -n shop', code: 0, t: 3000 }, { line: 'kubectl set image deploy/web web=nginx:9 -n shop', code: 1, t: 4000 }, { line: 'kubectl set image deploy/web web=nginx:1.25 -n shop', code: 0, t: 70000 }], sol);
eq(a.total, 5, 'total'); eq(a.actedFirst, true, 'acted first'); eq(a.failed, 1, 'failed'); eq(a.repeated, 1, 'repeated'); eq(a.looked, 1, 'looked'); eq(a.changed, 2, 'changed');
eq(a.gapAt, 4, 'longest pause is before the last command'); eq(a.refCount, 2, 'reference count');
eq(a.steps.map(s => s.tag).join(','), 'change,look,repeat,fail,change', 'tags');
eq(R.notes(a).length >= 3, true, 'notes for a messy run');
a = R.analyse([{ line: 'kubectl describe pod web-1 -n shop', code: 0, t: 1 }, { line: 'kubectl set image deploy/web web=nginx:1.25 -n shop', code: 0, t: 2 }], sol);
eq(a.actedFirst, false, 'looked first'); eq(/tidy/.test(R.notes(a)[0]), true, 'tidy note');
eq(R.analyse([], sol).total, 0, 'empty trail');
console.log(bad ? 'replay FAILED' : 'replay OK (' + (looks.length + changes.length) + ' classifications, analysis, notes)'); process.exit(bad ? 1 : 0);
