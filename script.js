/* ===== CONFIGURAZIONE (modifica qui i percorsi) ===== */
const CONFIG={csv:'02_database/database_immagini.csv',images:'01_immagini/',concurrency:6};
const $=s=>document.querySelector(s),cv=$('#cv'),cx=cv.getContext('2d'),wrap=$('#wrap');
const PAL=['#f8d9b4','#f0a35e','#d9703b','#b5492a','#f4c08a','#e58a4c','#c85c33','#fbe6cc'];
let items=[],col={},on=new Set(),V={k:1,x:0,y:0},sel=-1,hov=-1,mode='thumb',dirty=true,W=0,H=0,dpr=1,Dm=null,q='',drag=null,busy=false;
const css=n=>getComputedStyle(document.documentElement).getPropertyValue(n).trim();
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const msg=t=>{$('#st').textContent=t};
function parseCSV(t){t=t.replace(/^\uFEFF/,'');const l=t.split(/\r?\n/)[0]||'';const d=(l.match(/;/g)||[]).length>(l.match(/,/g)||[]).length?';':',';const R=[];let r=[],f='',iq=false;for(let i=0;i<t.length;i++){const c=t[i];if(iq){if(c=='"'){if(t[i+1]=='"'){f+='"';i++}else iq=false}else f+=c}else if(c=='"')iq=true;else if(c==d){r.push(f);f=''}else if(c=='\n'||c=='\r'){if(c=='\r'&&t[i+1]=='\n')i++;r.push(f);f='';R.push(r);r=[]}else f+=c}if(f!==''||r.length){r.push(f);R.push(r)}const h=R.shift().map(s=>s.trim().toLowerCase());return R.filter(x=>x.some(v=>v.trim())).map(x=>Object.fromEntries(h.map((k,i)=>[k,(x[i]||'').trim()])))}
function feat(bm){const s=24,c=document.createElement('canvas');c.width=c.height=s;const g=c.getContext('2d',{willReadFrequently:true});g.drawImage(bm,0,0,s,s);const p=g.getImageData(0,0,s,s).data,gr=[],grid=new Float64Array(27),hist=new Float64Array(64),eo=new Float64Array(32);
for(let y=0;y<s;y++)for(let x=0;x<s;x++){const i=(y*s+x)*4,r=p[i],gg=p[i+1],b=p[i+2],cell=((y/8|0)*3+(x/8|0))*3;grid[cell]+=r/64/255;grid[cell+1]+=gg/64/255;grid[cell+2]+=b/64/255;hist[(r>>6)*16+(gg>>6)*4+(b>>6)]+=1/576;gr[y*s+x]=.3*r+.59*gg+.11*b}
for(let y=1;y<s-1;y++)for(let x=1;x<s-1;x++){const gx=gr[y*s+x+1]-gr[y*s+x-1],gy=gr[(y+1)*s+x]-gr[(y-1)*s+x],m=Math.hypot(gx,gy);let a=Math.atan2(gy,gx);if(a<0)a+=Math.PI;eo[((y>=12?2:0)+(x>=12?1:0))*8+Math.min(7,a/Math.PI*8|0)]+=m}
const es=eo.reduce((a,b)=>a+b,0)||1;for(let i=0;i<32;i++)eo[i]/=es;return [...grid,...hist,...eo]}
function prep(F){const n=F.length,d=F[0].length;for(let j=0;j<d;j++){const w=1/Math.sqrt(j<27?27:j<91?64:32);let m=0,v=0;for(const f of F)m+=f[j]/n;for(const f of F)v+=(f[j]-m)**2/n;const sd=Math.sqrt(v)||1;for(const f of F)f[j]=(f[j]-m)/sd*w}return F}
function tsne(F){const n=F.length,D=new Float64Array(n*n);let sum=0;for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){let s=0;for(let k=0;k<F[i].length;k++){const d=F[i][k]-F[j][k];s+=d*d}D[i*n+j]=D[j*n+i]=s;sum+=2*s}Dm=D;const mean=sum/(n*(n-1))||1,P=new Float64Array(n*n),H0=Math.log(Math.min(30,Math.max(2,(n-1)/3)));
for(let i=0;i<n;i++){let b=1,lo=0,hi=Infinity;for(let t=0;t<60;t++){let sp=0,sd=0;for(let j=0;j<n;j++)if(j!=i){const d=D[i*n+j]/mean,e=Math.exp(-d*b);P[i*n+j]=e;sp+=e;sd+=d*e}sp=sp||1e-300;const h=Math.log(sp)+b*sd/sp;if(Math.abs(h-H0)<1e-5)break;if(h>H0){lo=b;b=hi==Infinity?b*2:(b+hi)/2}else{hi=b;b=(b+lo)/2}}let sp=0;for(let j=0;j<n;j++)sp+=P[i*n+j];for(let j=0;j<n;j++)P[i*n+j]/=sp||1}
const S=new Float64Array(n*n);for(let i=0;i<n;i++)for(let j=0;j<n;j++)S[i*n+j]=Math.max((P[i*n+j]+P[j*n+i])/(2*n),1e-12);
const Y=new Float64Array(2*n).map(()=>(Math.random()-.5)*.02),U=new Float64Array(2*n),G=new Float64Array(2*n).fill(1),N=new Float64Array(n*n),g=new Float64Array(2*n),T=500;let it=0;
function step(){const ex=it<120?8:1,mo=it<120?.5:.8;let Z=0;for(let i=0;i<n;i++)for(let j=i+1;j<n;j++){const dx=Y[2*i]-Y[2*j],dy=Y[2*i+1]-Y[2*j+1],v=1/(1+dx*dx+dy*dy);N[i*n+j]=N[j*n+i]=v;Z+=2*v}
g.fill(0);for(let i=0;i<n;i++)for(let j=0;j<n;j++)if(i!=j){const v=N[i*n+j],m=(ex*S[i*n+j]-v/Z)*v;g[2*i]+=4*m*(Y[2*i]-Y[2*j]);g[2*i+1]+=4*m*(Y[2*i+1]-Y[2*j+1])}
for(let k=0;k<2*n;k++){G[k]=Math.sign(g[k])!=Math.sign(U[k])?G[k]+.2:G[k]*.8;if(G[k]<.01)G[k]=.01;U[k]=mo*U[k]-120*G[k]*g[k];Y[k]+=U[k]}
let mx_=0,my_=0;for(let i=0;i<n;i++){mx_+=Y[2*i]/n;my_+=Y[2*i+1]/n}let mx=1e-9;for(let i=0;i<n;i++){Y[2*i]-=mx_;Y[2*i+1]-=my_;mx=Math.max(mx,Math.abs(Y[2*i]),Math.abs(Y[2*i+1]))}it++;return mx}
return new Promise(res=>{let mx=1;(function fr(){for(let r=0;r<6&&it<T;r++)mx=step();for(let i=0;i<n;i++){items[i].x=Y[2*i]/mx;items[i].y=Y[2*i+1]/mx}dirty=true;msg(it<T?'Calcolo della mappa… '+Math.round(it/T*100)+'%':n+' immagini sulla mappa');if(it<T)requestAnimationFrame(fr);else res()})()})}
function thumb(bm){const c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d'),w=bm.width,h=bm.height,s=Math.max(64/w,64/h);g.drawImage(bm,(64-w*s)/2,(64-h*s)/2,w*s,h*s);return c}
async function start(rows,bms){if(busy)return;busy=true;sel=-1;hov=-1;$('#det').hidden=true;$('#empty').style.display='none';
items=rows.map((r,i)=>({r,bm:bms[i],th:thumb(bms[i]),cat:r.category||'non indicata',x:0,y:0}));
const cats=[...new Set(items.map(i=>i.cat))];col={};cats.forEach((c,i)=>col[c]=PAL[i%PAL.length]);on=new Set(cats);
$('#chips').innerHTML='';cats.forEach(c=>{const b=document.createElement('button'),k=items.filter(i=>i.cat==c).length;b.textContent=c+' ('+k+')';b.style.setProperty('--c',col[c]);b.setAttribute('aria-pressed','true');b.onclick=()=>{on.has(c)?on.delete(c):on.add(c);b.setAttribute('aria-pressed',on.has(c));dirty=true};$('#chips').appendChild(b)});
V={k:1,x:W>760?170:0,y:0};msg('Estraggo le caratteristiche…');await new Promise(r=>setTimeout(r,30));
const F=prep(items.map(i=>feat(i.bm)));await tsne(F);NC={};NM=items.map((a,i)=>items.map((b,j)=>[j,(a.x-b.x)**2+(a.y-b.y)**2]).filter(o=>o[0]!=i).sort((p,r)=>p[1]-r[1]).slice(0,2).map(o=>o[0]));const t0=performance.now();items.forEach((it,i)=>it.b=t0+i*22+Math.random()*160);busy=false}
function vis(it){return on.has(it.cat)&&(!q||(it.r.id+' '+(it.r.subject||'')).toLowerCase().includes(q))}
const SC=()=>Math.min(W-(W>760?340:0),H)/2.3,sz=()=>Math.min(120,Math.max(16,34*Math.sqrt(V.k))),pos=(it,S)=>[W/2+V.x+it.x*S*V.k,H/2+V.y+it.y*S*V.k];
function pick(px,py){const S=SC(),z=sz();for(let i=items.length-1;i>=0;i--){const it=items[i];if(!vis(it))continue;const [x,y]=pos(it,S);if(mode=='thumb'?(Math.abs(px-x)<z/2&&Math.abs(py-y)<z/2):Math.hypot(px-x,py-y)<9)return i}return -1}
function tip(h,px,py){const t=$('#tip');if(h<0){t.style.display='none';return}const it=items[h];t.textContent=it.r.id+(it.r.subject?'\n'+it.r.subject:'')+'\n'+it.cat;t.style.display='block';t.style.left=Math.min(px+14,W-230)+'px';t.style.top=(py+14)+'px'}
function show(i){sel=i;const it=items[i],c=$('#big'),g=c.getContext('2d'),bm=it.bm,s=Math.min(c.width/bm.width,c.height/bm.height);g.clearRect(0,0,c.width,c.height);g.drawImage(bm,(c.width-bm.width*s)/2,(c.height-bm.height*s)/2,bm.width*s,bm.height*s);
$('#dl').innerHTML=Object.entries(it.r).filter(([k,v])=>v).map(([k,v])=>'<dt>'+esc(k)+'</dt><dd>'+esc(v)+'</dd>').join('');
const n=items.length,nb=$('#nb');nb.innerHTML='';[...Array(n).keys()].filter(j=>j!=i).sort((a,b)=>Dm[i*n+a]-Dm[i*n+b]).slice(0,5).forEach(j=>{const b=document.createElement('button'),k=document.createElement('canvas');k.width=k.height=64;k.getContext('2d').drawImage(items[j].th,0,0);b.appendChild(k);b.title=items[j].r.id;b.setAttribute('aria-label','Vai a '+items[j].r.id);b.onclick=()=>show(j);nb.appendChild(b)});
$('#det').hidden=false;dirty=true;const kk=Math.max(V.k,2.4);cam={k:kk,x:(W>760?170:0)-it.x*SC()*kk,y:-it.y*SC()*kk};boom(it.x,it.y,col[it.cat])}
function zoomAt(px,py,f){cam=null;const k=Math.min(12,Math.max(.4,V.k*f)),r=k/V.k;V.x=(px-W/2)-(px-W/2-V.x)*r;V.y=(py-H/2)-(py-H/2-V.y)*r;V.k=k;dirty=true}
cv.addEventListener('pointerdown',e=>{cam=null;stopTour();cv.setPointerCapture(e.pointerId);drag={x:e.clientX,y:e.clientY,vx:V.x,vy:V.y,m:false}});
cv.addEventListener('pointermove',e=>{const r=cv.getBoundingClientRect(),px=e.clientX-r.left,py=e.clientY-r.top;mx=px;my=py;if(drag){const dx=e.clientX-drag.x,dy=e.clientY-drag.y;if(Math.abs(dx)+Math.abs(dy)>4)drag.m=true;if(drag.m){V.x=drag.vx+dx;V.y=drag.vy+dy;dirty=true;return}}const h=pick(px,py);hov=h;tip(h,px,py);cv.style.cursor=h>=0?'pointer':'grab'});
cv.addEventListener('pointerup',e=>{const was=drag;drag=null;if(was&&!was.m){const r=cv.getBoundingClientRect(),h=pick(e.clientX-r.left,e.clientY-r.top);if(h>=0)show(h);else{const S=SC();boom((e.clientX-r.left-W/2-V.x)/(S*V.k),(e.clientY-r.top-H/2-V.y)/(S*V.k),'#ffd9b0')}}});
cv.addEventListener('pointerleave',()=>{hov=-1;mx=-999;tip(-1)});
cv.addEventListener('wheel',e=>{e.preventDefault();const r=cv.getBoundingClientRect();zoomAt(e.clientX-r.left,e.clientY-r.top,e.deltaY<0?1.15:1/1.15)},{passive:false});
$('#zi').onclick=()=>zoomAt(W/2,H/2,1.3);$('#zo').onclick=()=>zoomAt(W/2,H/2,1/1.3);$('#zr').onclick=()=>{cam={k:1,x:W>760?170:0,y:0}};
$('#q').oninput=e=>{q=e.target.value.trim().toLowerCase();dirty=true};
$('#md').onclick=e=>{mode=mode=='thumb'?'dot':'thumb';e.target.textContent=mode=='thumb'?'Mostra solo punti':'Mostra miniature';dirty=true};
$('#cp').onclick=()=>{if(!items.length)return msg('Crea prima la mappa.');const t='id,filename,category,x,y\n'+items.map(i=>[i.r.id,i.r.filename||'',i.cat,i.x.toFixed(4),i.y.toFixed(4)].map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n'),o=$('#out');o.value=t;const ok=()=>msg('Coordinate copiate negli appunti.'),fb=()=>{o.hidden=false;o.select();msg('Copia il testo qui sotto.')};try{navigator.clipboard.writeText(t).then(ok,fb)}catch(e){fb()}};
$('#go').onclick=async()=>{if(busy)return;const imgs=[...$('#fi').files],csv=$('#fc').files[0];$('#wn').textContent='';if(!imgs.length)return msg('Seleziona prima le immagini.');
const map=new Map(imgs.map(f=>[f.name.toLowerCase(),f]));msg('Leggo i file…');
const rows=csv?parseCSV(await csv.text()):imgs.map(f=>({id:f.name.replace(/\.[^.]+$/,''),filename:f.name})),R=[],B=[];let miss=0;
for(const r of rows){const f=map.get((r.filename||'').toLowerCase());if(!f){miss++;continue}try{B.push(await createImageBitmap(f));R.push(r)}catch(e){miss++}}
if(miss)$('#wn').textContent=miss+' righe del CSV senza file leggibile corrispondente: controlla la colonna filename.';
if(R.length<4)return msg('Servono almeno 4 immagini con riga corrispondente.');start(R,B)};
$('#ex').onclick=async()=>{if(busy)return;const rows=[],bms=[],C=['Portale','Balcone','Finestra'];for(let i=0;i<60;i++){const k=i%3,c=document.createElement('canvas');c.width=c.height=96;const g=c.getContext('2d'),h=[28,200,120][k]+Math.random()*30;g.fillStyle='hsl('+h+' 45% '+(35+Math.random()*30)+'%)';g.fillRect(0,0,96,96);g.fillStyle='hsl('+(h+40)+' 55% 80%)';if(k==0){g.beginPath();g.arc(48,52,14+Math.random()*16,0,7);g.fill()}else if(k==1){for(let x=6;x<96;x+=14+Math.random()*6)g.fillRect(x,0,6,96)}else g.fillRect(20+Math.random()*10,20+Math.random()*10,40,40);const id='IMG_'+String(i+1).padStart(4,'0');bms.push(await createImageBitmap(c));rows.push({id,filename:id+'.jpg',subject:'Esempio '+(i+1),category:C[k]})}start(rows,bms)};
let cam=null,mx=-999,my=-999,fx=[],NC={},NM=[],tour=0,seen=new Set();
const dust=Array.from({length:90},()=>({x:Math.random(),y:Math.random(),s:Math.random()*1.6+.4,p:Math.random()*6.3,v:Math.random()*.0004+.0001})),RM=matchMedia('(prefers-reduced-motion:reduce)').matches;
const ease=a=>{a=Math.min(1,Math.max(0,a));return 1+2.70158*Math.pow(a-1,3)+1.70158*Math.pow(a-1,2)};
const nearest=(i,k)=>{const n=items.length;return [...Array(n).keys()].filter(j=>j!=i).sort((a,b)=>Dm[i*n+a]-Dm[i*n+b]).slice(0,k)},links=i=>NC[i]||(NC[i]=nearest(i,5));
const boom=(x,y,c)=>fx.push({x,y,c,t0:performance.now(),sp:Array.from({length:16},(_,k)=>({a:k/16*6.283+Math.random()*.3,v:60+Math.random()*90}))});
function stopTour(){if(tour){clearInterval(tour);tour=0;$('#tr').textContent='Passeggiata'}}
function hop(){const n=items.length;if(!n)return;const cur=sel>=0?sel:0;seen.add(cur);let nx=sel<0?cur:nearest(cur,n-1).find(j=>!seen.has(j)&&vis(items[j]));if(nx==null){seen.clear();nx=nearest(cur,1)[0]}show(nx)}
$('#tr').onclick=()=>{if(tour)return stopTour();if(!items.length)return msg('Crea prima la mappa.');seen=new Set();$('#tr').textContent='Ferma la passeggiata';hop();tour=setInterval(hop,2800)};
function art(t){
const s=Math.min(W,H)/560,rm=RM?0:1,px=V.x*.1,py=V.y*.05,sg='rgba(250,214,176,',F='Fraunces,Georgia,serif';
const cap=(a,b,x,y,rgb)=>{const sg=rgb||'rgba(250,214,176,';const m=Math.min(320,W*.8);x=Math.min(W-m/2-8,Math.max(m/2+8,x));cx.textAlign='center';cx.fillStyle=sg+'.62)';cx.font='italic 600 '+Math.max(15,19*s)+'px '+F;cx.fillText(a,x,y,m);cx.fillStyle=sg+'.42)';cx.font='italic 400 '+Math.max(12,14*s)+'px '+F;cx.fillText(b,x,y+Math.max(17,20*s),m)};
cx.save();cx.lineCap='round';cx.lineJoin='round';
cx.translate(W*.62+px,H*.24+py+Math.sin(t*.0005)*9*rm);cx.rotate(-.1+Math.sin(t*.0004)*.02*rm);cx.scale(s,s);
cx.strokeStyle='rgba(255,138,36,.78)';cx.fillStyle='rgba(255,196,48,.16)';cx.shadowColor='rgba(255,140,40,.7)';cx.shadowBlur=14;cx.lineWidth=1.8;
cx.beginPath();cx.ellipse(0,0,46,19,-.25,0,7);cx.fill();cx.stroke();
cx.beginPath();cx.moveTo(-38,-12);cx.quadraticCurveTo(-56,-28,-64,-34);cx.moveTo(-60,-38);cx.arc(-70,-38,10,0,7);cx.moveTo(-79,-38);cx.lineTo(-96,-33);cx.lineTo(-80,-31);cx.stroke();cx.fillRect(-74,-42,2.5,2.5);
cx.strokeStyle='rgba(255,176,40,.75)';cx.beginPath();for(let i=0;i<16;i++){const x=44+i*11,y=8+i*1.1+Math.sin(t*.0012+i*.4)*2.5*rm;cx.moveTo(x,y);cx.lineTo(x+16,y+14);cx.moveTo(x,y);cx.lineTo(x+16,y-4)}cx.moveTo(42,6);cx.bezierCurveTo(110,10,170,22,230,22);cx.moveTo(42,12);cx.bezierCurveTo(110,26,170,38,230,32);cx.stroke();
const fl=Math.sin(t*.0014)*.12*rm;cx.strokeStyle='rgba(255,214,70,.85)';cx.beginPath();for(let k=0;k<10;k++){const a=-2.6+k*.2+fl,L=60+k*7,ex=-4+Math.cos(a)*L,ey=-14+Math.sin(a)*L;cx.moveTo(-4,-14);cx.quadraticCurveTo((-4+ex)/2+8,(-14+ey)/2-10,ex,ey)}cx.stroke();
cx.strokeStyle='rgba(255,138,36,.78)';cx.beginPath();cx.moveTo(-2,16);cx.lineTo(-10,40);cx.lineTo(-24,56);cx.lineTo(-34,60);cx.moveTo(-24,56);cx.lineTo(-30,64);cx.moveTo(-24,56);cx.lineTo(-18,64);cx.stroke();
cx.restore();
cap('archaeopteryx','Giurassico, circa 150 milioni di anni fa',W*.62+px+40*s,H*.24+py+118*s,'rgba(255,172,52,');
cx.save();cx.lineCap='round';cx.lineJoin='round';cx.translate(W*.8+px*1.3,H*.78+py+Math.cos(t*.0006)*5*rm);cx.scale(s*1.1,s*1.1);
cx.strokeStyle='rgba(112,200,86,.72)';cx.fillStyle='rgba(112,200,86,.14)';cx.shadowColor='rgba(120,210,90,.6)';cx.shadowBlur=12;cx.lineWidth=1.8;
cx.beginPath();cx.ellipse(0,0,42,13,0,0,7);cx.fill();cx.stroke();cx.beginPath();cx.arc(52,-3,11,0,7);cx.stroke();
cx.beginPath();[-1,1].forEach(d=>{cx.moveTo(60,-10);cx.bezierCurveTo(90,-40+Math.sin(t*.003+d)*6*rm,120,-30+d*10,150,-60+d*14+Math.sin(t*.0025)*8*rm)});cx.moveTo(-30,-10);cx.quadraticCurveTo(0,-30,34,-8);cx.quadraticCurveTo(0,-12,-30,-10);cx.moveTo(-10,8);cx.lineTo(-40,-14);cx.lineTo(-66,26);cx.lineTo(-76,34);cx.moveTo(28,10);cx.lineTo(38,32);cx.lineTo(30,42);cx.moveTo(10,11);cx.lineTo(16,34);cx.lineTo(8,44);cx.moveTo(-42,0);cx.lineTo(-62,-6);cx.moveTo(-42,3);cx.lineTo(-64,6);cx.stroke();
cx.setLineDash([2,7]);for(let i=0;i<3;i++){const q=(t*.0005+i/3)%1;cx.strokeStyle='rgba(140,222,104,'+(Math.pow(1-q,3)*.75)+')';cx.beginPath();cx.arc(0,-20,14+q*80,-1.4,-.2);cx.stroke()}cx.setLineDash([]);
cx.restore();
cap('Kauai: i grilli che hanno perso il canto','l’ala piatta li rende muti e li salva dalla mosca parassita',W*.8+px*1.3-30*s,H*.78+py+72*s,'rgba(132,214,100,')}
function render(t){
if(cam){V.k+=(cam.k-V.k)*.09;V.x+=(cam.x-V.x)*.09;V.y+=(cam.y-V.y)*.09}
cx.setTransform(dpr,0,0,dpr,0,0);
const cX=W/2+V.x,cY=H/2+V.y,g0=cx.createRadialGradient(cX,cY,0,cX,cY,Math.max(W,H)*.8);g0.addColorStop(0,'#7a3216');g0.addColorStop(.5,'#3b170b');g0.addColorStop(1,'#150704');cx.fillStyle=g0;cx.fillRect(0,0,W,H);
if(mx>0){const sg=cx.createRadialGradient(mx,my,0,mx,my,280);sg.addColorStop(0,'rgba(255,205,150,.2)');sg.addColorStop(1,'rgba(255,205,150,0)');cx.fillStyle=sg;cx.fillRect(0,0,W,H)}
dust.forEach(d=>{d.y-=d.v;if(d.y<0)d.y=1;const x=(((d.x*W+V.x*.2*d.s)%W)+W)%W;cx.fillStyle='rgba(255,214,170,'+(.3+.3*Math.sin(t*.002+d.p))+')';cx.beginPath();cx.arc(x,d.y*H,d.s,0,7);cx.fill()});
const S=SC(),z=sz(),th=mode=='thumb';
cx.lineWidth=1;cx.setLineDash([3,12]);cx.lineDashOffset=-t*.012;for(let r=1;r<=7;r++){cx.beginPath();cx.arc(cX,cY,r*S*V.k*.3*(1+.012*Math.sin(t*.001+r)),0,7);cx.strokeStyle='rgba(250,205,165,'+(.24-r*.028)+')';cx.stroke()}cx.setLineDash([]);
art(t);if(items.length){
const rm=RM?0:1,born=i=>items[i].b!=null&&t>=items[i].b,A=items.map((it,i)=>{const [x,y]=pos(it,S),a=it.b==null?1:ease((t-it.b)/850);it.hs=(it.hs||0)+(((i==hov||i==sel)?1:0)-(it.hs||0))*.18;return {x:x+Math.cos(t*.0011+i*1.7)*1.6*rm,y:y+Math.sin(t*.0015+i)*2.6*rm+(it.b==null?0:(1-a)*-H*.55),a,s:z*(1+.5*it.hs)*(.55+.45*Math.min(1,a))}});
cx.lineWidth=1;cx.globalAlpha=.22+.08*Math.sin(t*.002);items.forEach((a,i)=>{if(!vis(a)||!born(i))return;(NM[i]||[]).forEach(j=>{if(!items[j]||!vis(items[j])||!born(j))return;cx.beginPath();cx.moveTo(A[i].x,A[i].y);cx.lineTo(A[j].x,A[j].y);cx.strokeStyle=col[a.cat];cx.stroke()})});cx.globalAlpha=1;
cx.lineWidth=2;cx.setLineDash([6,8]);cx.lineDashOffset=-t*.04;cx.strokeStyle='#ffe2bd';[hov,sel].forEach(k=>{if(k<0||!Dm||!born(k))return;cx.globalAlpha=k==sel?.85:.6;links(k).forEach(j=>{cx.beginPath();cx.moveTo(A[k].x,A[k].y);cx.lineTo(A[j].x,A[j].y);cx.stroke()})});cx.setLineDash([]);cx.globalAlpha=1;
const one=(i,big)=>{const it=items[i],b=it.b,o=A[i],c=col[it.cat];if(b!=null&&t<b)return;
if(b==null||!th){cx.save();cx.shadowColor=c;cx.shadowBlur=18;cx.beginPath();cx.arc(o.x,o.y,(big?9:6)*(b==null?.7:1)*(1+.5*it.hs),0,7);cx.fillStyle=c;cx.fill();cx.restore();if(big){cx.lineWidth=3;cx.strokeStyle='#f4efe3';cx.stroke()}return}
const s=o.s,p=s*.07;cx.save();cx.globalAlpha=Math.min(1,o.a*1.4);cx.translate(o.x,o.y);cx.rotate(((i*37%11)-5)*.014+(1-Math.min(1,o.a))*.9+Math.sin(t*.0009+i)*.02*rm);cx.shadowColor=it.hs>.05?c:'rgba(0,0,0,.6)';cx.shadowBlur=12+26*it.hs;cx.shadowOffsetY=4;cx.fillStyle=big?'#fff':'#f4efe3';cx.fillRect(-s/2-p,-s/2-p,s+2*p,s+p*3.4);cx.shadowColor='transparent';cx.drawImage(it.th,-s/2,-s/2,s,s);cx.fillStyle=c;cx.fillRect(-s/2,s/2+p*1.1,s*.4,Math.max(2,p*.8));if(big){cx.lineWidth=2.5;cx.strokeStyle='#ffe2bd';cx.strokeRect(-s/2-p,-s/2-p,s+2*p,s+p*3.4)}cx.restore();
if(big){const q=(t%1500)/1500;cx.globalAlpha=1-q;cx.lineWidth=2;cx.strokeStyle='#ffe2bd';cx.beginPath();cx.arc(o.x,o.y,s*.75+q*s*.9,0,7);cx.stroke();cx.globalAlpha=1}};
items.forEach((a,i)=>{if(!vis(a)&&a.b!=null&&t>=a.b){cx.globalAlpha=.25;cx.beginPath();cx.arc(A[i].x,A[i].y,3,0,7);cx.fillStyle=col[a.cat];cx.fill();cx.globalAlpha=1}});
items.forEach((a,i)=>{if(vis(a)&&i!=sel&&i!=hov)one(i,false)});
if(hov>=0&&hov!=sel&&vis(items[hov]))one(hov,false);if(sel>=0)one(sel,true)}
fx=fx.filter(f=>t-f.t0<1100);fx.forEach(f=>{const p=(t-f.t0)/1100,[x,y]=pos(f,S);cx.globalAlpha=1-p;cx.strokeStyle=f.c;cx.fillStyle=f.c;cx.lineWidth=2;cx.beginPath();cx.arc(x,y,10+p*140,0,7);cx.stroke();f.sp.forEach(s=>{const d=s.v*p*(2-p);cx.beginPath();cx.arc(x+Math.cos(s.a)*d,y+Math.sin(s.a)*d,2.5*(1-p)+.5,0,7);cx.fill()})});cx.globalAlpha=1}
new ResizeObserver(()=>{dpr=window.devicePixelRatio||1;W=wrap.clientWidth;H=wrap.clientHeight;cv.width=W*dpr;cv.height=H*dpr;dirty=true}).observe(wrap);
(function L(t){render(t||0);requestAnimationFrame(L)})();

/* ===== CARICAMENTO AUTOMATICO DA REPOSITORY ===== */
async function autoload(){
 try{
  msg('Cerco il database…');
  const res=await fetch(CONFIG.csv,{cache:'no-cache'});
  if(!res.ok)throw new Error('csv');
  const rows=parseCSV(await res.text());
  if(!rows.length)throw new Error('vuoto');
  const out=new Array(rows.length),queue=rows.map((r,i)=>i);let miss=0,done=0;
  async function work(){while(queue.length){const i=queue.shift(),f=(rows[i].filename||'').trim();
   try{if(!f)throw 0;const rs=await fetch(CONFIG.images+f.split('/').map(encodeURIComponent).join('/'));if(!rs.ok)throw 0;out[i]=await createImageBitmap(await rs.blob())}catch(e){miss++}
   done++;msg('Carico le immagini… '+done+'/'+rows.length)}}
  await Promise.all(Array.from({length:CONFIG.concurrency},work));
  const R=[],B=[];rows.forEach((r,i)=>{if(out[i]){R.push(r);B.push(out[i])}});
  if(miss)$('#wn').textContent=miss+' righe del CSV senza immagine corrispondente: controlla la colonna filename (attenzione a maiuscole e minuscole).';
  if(R.length<4){msg('Servono almeno 4 immagini valide in '+CONFIG.images);return}
  $('#dati').classList.add('auto');start(R,B)
 }catch(e){msg('Database non trovato in '+CONFIG.csv+'. Puoi caricare i file a mano qui sotto.')}
}
autoload();

