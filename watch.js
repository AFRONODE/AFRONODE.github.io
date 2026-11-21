const fs=require('fs'),webpush=require('web-push'),{Cell}=require('@ton/core');
const E=process.env;
webpush.setVapidDetails('mailto:afronodedapp@gmail.com',E.VAPID_PUBLIC,E.VAPID_PRIVATE);
const st=fs.existsSync('state.json')?JSON.parse(fs.readFileSync('state.json','utf8')):{sent:{}};
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
async function rpc(m,s){for(let i=0;i<4;i++){const r=await fetch('https://testnet.toncenter.com/api/v2/runGetMethod',{method:'POST',headers:{'Content-Type':'application/json','X-API-Key':E.TCKEY},body:JSON.stringify({address:E.ESCROW,method:m,stack:s})});const j=await r.json();if(j.ok)return j.result.stack;await sleep(1500);}throw new Error('toncenter unavailable');}
(async()=>{
 const n=parseInt((await rpc('get_task_count',[]))[0][1],16);
 const fr=await fetch('https://firestore.googleapis.com/v1/projects/afro-node-dapp-on-ton/databases/(default)/documents/push_subs?pageSize=300&key='+E.FBKEY);
 const docs=(await fr.json()).documents||[]; const subs={};
 for(const d of docs){const w=d.fields.wallet.stringValue;(subs[w]=subs[w]||[]).push(JSON.parse(d.fields.sub.stringValue));}
 for(let id=1;id<=n;id++){
  if(st.sent[id])continue;
  const t=(await rpc('get_task',[['num',String(id)]]))[0]; await sleep(200);
  if(t[0]!=='tuple')continue;
  const el=t[1].elements; const status=parseInt(el[6].number.number);
  if(status>3){st.sent[id]=1;continue;}
  if(status!==3)continue;
  let who; try{who=Cell.fromBase64(el[0].slice.bytes).beginParse().loadAddress().toRawString();}catch{continue;}
  const list=subs[who]||[]; if(!list.length)continue;
  const payload=JSON.stringify({title:'Your gig has been completed',body:'Your posted gig has been completed and submitted by the freelancer. Review the work to release funds or open a dispute.',url:'https://testnet.afro-node.com/#nav-clientgigs',tag:'gig-'+id});
  for(const s of list){try{await webpush.sendNotification(s,payload);}catch(e){}}
  st.sent[id]=1;
 }
 fs.writeFileSync('state.json',JSON.stringify(st));
})().catch(e=>console.error(e.message));
