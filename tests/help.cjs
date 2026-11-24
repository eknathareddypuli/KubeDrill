// Regression: help, typo suggestions and crictl. Every listed command must exit 0 with the expected text.
require('../tools/lab-env.cjs'); require('../assets/js/sim.js');
const S = (global.KL && global.KL.Sim) || global.Sim; let bad = 0, n = 0;
const s = new S(); s.settle && s.settle(5);
function t(c, code, re) { n++; const r = s.exec(c), txt = r.stdout + r.stderr; if (r.code !== code || !re.test(txt)) { bad++; console.log('FAIL', c, '->', r.code, txt.slice(0, 80).replace(/\n/g, ' / ')); } }
const verbs = ['get', 'describe', 'run', 'create', 'apply', 'delete', 'expose', 'scale', 'rollout', 'logs', 'exec', 'edit', 'label', 'annotate', 'patch', 'set', 'top', 'config', 'explain', 'cordon', 'uncordon', 'drain', 'taint', 'port-forward', 'api-resources', 'wait', 'diff', 'autoscale', 'replace', 'cp', 'certificate', 'debug', 'attach', 'events', 'version', 'cluster-info', 'completion', 'plugin', 'api-versions', 'kustomize'];
verbs.forEach(v => { t('kubectl ' + v + ' --help', 0, /Usage:/); t('kubectl ' + v + ' -h', 0, /Usage:/); t('kubectl help ' + v, 0, /Usage:/); });
['rollout status', 'rollout undo', 'rollout history', 'rollout restart', 'auth can-i', 'create deployment', 'create role', 'config view', 'set image', 'certificate approve', 'plugin list', 'top pod'].forEach(v => t('kubectl ' + v + ' --help', 0, /Usage:/));
t('kubectl get pods -n kube-system --help', 0, /Display one or many/);
t('k get --help', 0, /Display one or many/); t('kubectl options', 0, /following options/); t('kubectl --help', 0, /kubectl controls/);
t('kubectl gett pods', 1, /Did you mean this\?\s+get/); t('kubectl descibe pod x', 1, /describe/); t('kubectl zzzzzz', 1, /unknown command/); t('kubectl get', 1, /resource/);
t('kubectl plugin list', 0, /plugins/);
['--help', 'install --help', 'upgrade -h', 'rollback --help', 'list --help', 'repo --help'].forEach(a => t('helm ' + a, 0, /Usage|Kubernetes package manager/));
t('kubeadm --help', 0, /Usage:/); t('crictl --help', 0, /crictl/); t('crictl ps', 0, /CONTAINER/); t('crictl pods', 0, /POD ID/); t('crictl images', 0, /IMAGE/); t('crictl logs nosuchid', 1, /NotFound/); t('ssh cp1 "sudo crictl ps"', 0, /CONTAINER/);
t('kubectl get --help | grep sort', 0, /sort-by/);
console.log(bad ? 'help: ' + bad + '/' + n + ' failed' : 'help: ' + n + ' ok'); process.exit(bad ? 1 : 0);
