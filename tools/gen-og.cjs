// Regenerates icons/og.png (1200x630) from the live counts in the app, so the card never states a stale number.
// Usage: node tools/gen-og.cjs   (needs playwright-core and Chrome; set CHROME to override the binary)
const {chromium}=require('playwright-core');const path=require('path');
(async()=>{const exe=process.env.CHROME||'/usr/bin/google-chrome';const b=await chromium.launch({executablePath:exe,args:['--no-sandbox']});
const root=path.resolve(__dirname,'..');const p=await b.newPage({viewport:{width:1200,height:630}});
await p.goto('file://'+root+'/index.html');await p.waitForTimeout(1200);
const n=await p.evaluate(()=>({labs:KL.Labs.list.length,quiz:KL.quizAll.length}));
const html=`<html><body style="margin:0;width:1200px;height:630px;background:radial-gradient(circle at 80% 18%,#1d34a8 0,#0f1d45 22%,#0a0f1d 52%,#080b14 100%);font-family:Inter,'Helvetica Neue',Arial,sans-serif;color:#e8eefb;position:relative;overflow:hidden">
<div style="position:absolute;left:80px;top:140px;font-size:26px;letter-spacing:.5px;color:#2dd4a4">FREE · OFFLINE · NO ADS</div>
<div style="position:absolute;left:80px;top:196px;font-size:132px;font-weight:800;letter-spacing:-3px;line-height:1.1"><span style="color:#eef3ff">Kube</span><span style="color:#5ea5ff">Drill</span></div>
<div style="position:absolute;left:80px;top:354px;font-size:38px;line-height:1.38;color:#8fa0c4;width:900px">Practise Kubernetes in your browser —<br>${n.labs} auto-checked labs, a kubectl simulator,<br>exam mode and ${n.quiz} questions.</div></body></html>`;
const q=await b.newPage({viewport:{width:1200,height:630}});await q.setContent(html);await q.waitForTimeout(300);
await q.screenshot({path:path.join(root,'icons','og.png'),type:'png'});console.log('og.png written:',n);await b.close()})()
