/* ============================================================
   Science journey · flat 2D neurons and DNA (projects.html)
   Replaces the 3D neuron and DNA models with flat, drawn shapes:
   blob-shaped neurons (canvas sprites that always face the camera),
   flat lines between them, and a flat-coloured DNA ladder.
   Called from js/science/assets.js right after the originals are
   built; everything that moves them (js/science/scenes.js) is unchanged.
   Colours: SJ_BLOBS.dark below.
   ============================================================ */
(function(){
function lin(T,c){ return new T.Color(c).convertSRGBToLinear(); }
function clear(g){ g.children.slice().forEach(function(c){ if(c.isMesh||c.isSprite) g.remove(c); }); }
var seed=7; function rnd(){ seed=(seed*1664525+1013904223)>>>0; return seed/4294967296; }
// one 2D neuron: a soft blob body with tapered, rounded arms, outlined, with a nucleus and a highlight
function blobTex(T, fill, line, nuc){
  var S=256, cv=document.createElement('canvas'); cv.width=cv.height=S; var g=cv.getContext('2d'), cx=S/2, cy=S/2;
  var arms=[], n=4+Math.floor(rnd()*2), a0=rnd()*6.283;
  for(var i=0;i<n;i++) arms.push({a:a0+i*6.283/n+(rnd()-.5)*.5, len:0.68+rnd()*0.2, w:0.62+rnd()*0.25});
  function r(th){ var v=0.40+Math.sin(th*3+a0)*0.025; arms.forEach(function(A){ var d=Math.atan2(Math.sin(th-A.a),Math.cos(th-A.a)); v=Math.max(v, 0.40 + (A.len-0.40)*Math.exp(-(d*d)/(2*Math.pow(A.w*0.32,2)))); }); return v; }
  g.beginPath(); for(var k=0;k<=360;k++){ var th=k/360*6.283, rr=r(th)*S*0.48; var x=cx+Math.cos(th)*rr, y=cy+Math.sin(th)*rr; if(!k) g.moveTo(x,y); else g.lineTo(x,y); }
  g.closePath(); g.fillStyle=fill; g.fill(); g.lineJoin='round'; g.lineWidth=7; g.strokeStyle=line; g.stroke();
  arms.forEach(function(A){ var x=cx+Math.cos(A.a)*A.len*S*0.48, y=cy+Math.sin(A.a)*A.len*S*0.48;  });
  g.beginPath(); g.arc(cx+6,cy+4,S*0.095,0,6.283); g.fillStyle=nuc; g.fill();
  g.beginPath(); g.ellipse(cx-S*0.07,cy-S*0.07,S*0.05,S*0.03,-0.6,0,6.283); g.fillStyle='rgba(255,255,255,.75)'; g.fill();
  var t=new T.CanvasTexture(cv); t.encoding=T.sRGBEncoding; return t;
}
function build(o, V){
  var T=o.T, neural=o.neural, dna=o.dna, pts=o.neurons.map(function(n){return n.p.clone();});
  clear(neural); o.neurons.length=0;
  pts.forEach(function(p,i){
    var c=V.cells[i%V.cells.length];
    var sp=new T.Sprite(new T.SpriteMaterial({ map: blobTex(T,c,V.line,V.nuc), transparent:true, depthWrite:false }));
    sp.material.emissive=new T.Color(); sp.material.depthTest=false; sp.renderOrder=5; sp.position.copy(p); sp.scale.setScalar(2.1); neural.add(sp);
    var halo=o.K.sprite(o.K.glowTex("rgba(255,255,255,1)"),0xffffff,1.6); halo.material.color.set(V.halo); halo.position.copy(p); halo.renderOrder=1; neural.add(halo);
    o.neurons.push({p:p,m:sp,halo:halo});
  });
  o.axons.length=0; var linked={}, axM=new T.MeshBasicMaterial({color:lin(T,V.axon)}), axO=new T.MeshBasicMaterial({color:lin(T,V.axonLine||V.line)});
  o.neurons.forEach(function(n,i){
    o.neurons.map(function(q,j){return {j:j,d:n.p.distanceTo(q.p)};}).filter(function(t){return t.j!==i;}).sort(function(a,b){return a.d-b.d;}).slice(0,2).forEach(function(t){
      var key=Math.min(i,t.j)+'-'+Math.max(i,t.j); if(linked[key]) return; linked[key]=1;
      var q=o.neurons[t.j].p, mid=n.p.clone().lerp(q,.5).add(new T.Vector3((rnd()-.5)*1.4,(rnd()-.5)*1.4,0)), curve=new T.QuadraticBezierCurve3(n.p,mid,q);
      var outline=new T.Mesh(new T.TubeGeometry(curve,40,0.075,6,false),axO); outline.position.z-=0.02; neural.add(outline);
      neural.add(new T.Mesh(new T.TubeGeometry(curve,40,0.045,6,false),axM));
      o.axons.push({curve:curve,from:i,to:t.j}); o.axons.push({curve:new T.QuadraticBezierCurve3(q,mid,n.p),from:t.j,to:i});
    });
  });
  // DNA: flat colors, no shading — reads as a drawn ladder
  clear(dna); var sM=new T.MeshBasicMaterial({color:lin(T,V.strand)}), lM=new T.MeshBasicMaterial({color:lin(T,V.line)}), rM=V.rungs.map(function(c){return new T.MeshBasicMaterial({color:lin(T,c)});}), H=[[],[]];
  for(var k=0;k<30;k++){ var y=-5.8+k*0.4, a=k*0.5, A=new T.Vector3(Math.cos(a)*1.1,y,Math.sin(a)*1.1), B=new T.Vector3(-Math.cos(a)*1.1,y,-Math.sin(a)*1.1); H[0].push(A); H[1].push(B);
    var M=A.clone().lerp(B,.5), UP=new T.Vector3(0,1,0);
    [[A,rM[k%4]],[B,rM[(k+2)%4]]].forEach(function(pr){ var P=pr[0], len=P.distanceTo(M), cyl=new T.Mesh(new T.CylinderGeometry(0.09,0.09,len,10),pr[1]); cyl.position.copy(P).lerp(M,.5); cyl.quaternion.setFromUnitVectors(UP,M.clone().sub(P).normalize()); dna.add(cyl); });
  }
  H.forEach(function(ps){ var cv=new T.CatmullRomCurve3(ps); dna.add(new T.Mesh(new T.TubeGeometry(cv,200,0.13,8,false),lM)); dna.add(new T.Mesh(new T.TubeGeometry(cv,200,0.09,8,false),sM)); });
}
window.SJ_BLOBS = {
  dark:  { axonLine:'#6B79C4', cells:['#8C97D6','#CDEBDD','#F0AE8F','#F3E27A'], line:'#1E2340', nuc:'#3D4680', halo:'#8C97D6', axon:'#FFF8F3', strand:'#FFF8F3', rungs:['#CDEBDD','#F3E27A','#F0AE8F','#8C97D6'] },
  cream: { cells:['#8C97D6','#CDEBDD','#F0AE8F','#F3E27A'], line:'#3D4680', nuc:'#3D4680', halo:'#FFFFFF', axon:'#8C97D6', strand:'#FFF8F3', rungs:['#CDEBDD','#F3E27A','#F0AE8F','#8C97D6'] },
};
window.SciBlobs = function(o){ build(o, window.SJ_BLOBS.dark); };
})();
