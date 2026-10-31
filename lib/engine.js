// Body Clock Kit schedule engine (pure, no DOM). Port to TypeScript.
// buildPlan(state) -> { events, info, dep, ret }
/* ---------- core logic (no DOM) ---------- */
var ZONES=[
 {id:"America/Denver",city:"Denver",code:"DEN"},{id:"America/New_York",city:"New York",code:"NYC"},
 {id:"America/Chicago",city:"Chicago",code:"CHI"},{id:"America/Los_Angeles",city:"Los Angeles",code:"LAX"},
 {id:"America/Mexico_City",city:"Mexico City",code:"MEX"},{id:"Pacific/Honolulu",city:"Honolulu",code:"HNL"},
 {id:"America/Sao_Paulo",city:"São Paulo",code:"SAO"},{id:"America/Argentina/Buenos_Aires",city:"Buenos Aires",code:"BUE"},
 {id:"Atlantic/Reykjavik",city:"Reykjavik",code:"KEF"},{id:"Europe/London",city:"London",code:"LON"},
 {id:"Europe/Amsterdam",city:"Amsterdam",code:"AMS"},{id:"Europe/Paris",city:"Paris",code:"PAR"},
 {id:"Europe/Zurich",city:"Geneva",code:"GVA"},{id:"Europe/Rome",city:"Rome",code:"ROM"},
 {id:"Europe/Athens",city:"Athens",code:"ATH"},{id:"Europe/Istanbul",city:"Istanbul",code:"IST"},
 {id:"Africa/Johannesburg",city:"Cape Town",code:"CPT"},{id:"Africa/Nairobi",city:"Nairobi",code:"NBO"},
 {id:"Asia/Dubai",city:"Dubai",code:"DXB"},{id:"Asia/Kolkata",city:"Mumbai",code:"BOM"},
 {id:"Asia/Bangkok",city:"Bangkok",code:"BKK"},{id:"Asia/Singapore",city:"Singapore",code:"SIN"},
 {id:"Asia/Seoul",city:"Seoul",code:"SEL"},{id:"Asia/Tokyo",city:"Tokyo",code:"TYO"},
 {id:"Australia/Sydney",city:"Sydney",code:"SYD"},{id:"Pacific/Auckland",city:"Auckland",code:"AKL"}
];
var KITS=[
 {k:"mellow",name:"Melatonin + magnesium",text:"Melatonin 5 mg (1 capsule) + 2 magnesium glycinate capsules",sub:"Plane sleep and the first nights. Back off the melatonin dose with your next bottle."},
 {k:"protect",name:"Vitamin C",text:"Vitamin C, 2 capsules (1,000 mg)",sub:"Optional. Before boarding and again with an in-flight meal."},
 {k:"sustain",name:"Fish oil",text:"Fish oil, 2 softgels, with food",sub:"Once before boarding and once in flight. Ask your prescriber before going higher."},
 {k:"reset",name:"Pre-landing reset",text:"B12 1000 mcg softgel + 3-4 sugar packets or 1 tbsp honey, with coffee",sub:"About an hour before landing. A common travel routine, not proven for jet lag."},
 {k:"socks",name:"Compression socks",text:"Put them on before boarding",sub:"Walk the aisle every hour or two."},
 {k:"coffee",name:"Coffee",text:"Your own coffee, after daylight and breakfast",sub:"First full local morning"},
 {k:"glasses",name:"Amber glasses",text:"Amber glasses on, lights low",sub:"Two hours before bed, and on the plane overnight"},
 {k:"light",name:"Light timing",text:"Outside or by a bright window for 30 minutes or more",sub:"Morning going east, afternoon going west"},
 {k:"caffeine",name:"Caffeine cutoff",text:"No more coffee or tea today",sub:"Eight hours before bed"},
 {k:"water",name:"Water + electrolytes",text:"Electrolyte packet in a full bottle",sub:"Around the flight"}
];
function capFor(q,tag,S){
  if(q===""||q==null||isNaN(q))return Infinity;
  if(!(S.nights>0))return q;
  return tag==="out"?Math.ceil(q/2):Math.floor(q/2);
}
var CITY={}; ZONES.forEach(function(z){CITY[z.id]=z});
var dtfs={};
function parts(zone,ms){
  var f=dtfs[zone]||(dtfs[zone]=new Intl.DateTimeFormat("en-US",{timeZone:zone,hourCycle:"h23",year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",second:"2-digit"}));
  var o={}; f.formatToParts(new Date(ms)).forEach(function(p){if(p.type!=="literal")o[p.type]=+p.value}); if(o.hour===24)o.hour=0; return o;
}
function offsetMin(zone,ms){var p=parts(zone,ms);return Math.round((Date.UTC(p.year,p.month-1,p.day,p.hour,p.minute,p.second)-Math.floor(ms/1000)*1000)/60000)}
function localToUTC(zone,y,mo,d,h,mi){var g=Date.UTC(y,mo-1,d,h,mi);var t=g-offsetMin(zone,g)*60000;t=g-offsetMin(zone,t)*60000;return t}
function hourOf(zone,ms){return parts(zone,ms).hour}
var tfs={},dfs={};
function fmtT(zone,ms){var f=tfs[zone]||(tfs[zone]=new Intl.DateTimeFormat("en-US",{timeZone:zone,hour:"numeric",minute:"2-digit"}));return f.format(ms).replace(/ /g," ")}
function fmtD(zone,ms){var f=dfs[zone]||(dfs[zone]=new Intl.DateTimeFormat("en-US",{timeZone:zone,weekday:"short",month:"short",day:"numeric"}));return f.format(ms)}
function hm(s,dh,dm){var a=(s||"").split(":");return a.length>=2?(+a[0])*60+(+a[1]):dh*60+dm}

function genLeg(o,S){
  var land=o.dep+o.hrs*36e5, ev=[];
  var raw=(offsetMin(o.dz,land)-offsetMin(o.oz,o.dep))/60;
  var e=(((raw+12)%24)+24)%24-12;
  var east=e>0, abs=Math.abs(e);
  var adj=abs<2?0:Math.min(5,Math.max(2,Math.ceil(abs/(east?1:1.5))));
  var info={shift:e,east:east,adj:adj,land:land};
  if(adj===0)return {events:ev,info:info};
  var oc=CITY[o.oz].city, dc=CITY[o.dz].city;
  function add(kind,t,zone,title,grp,extra){
    var kit=S.kit[kind]; if(!kit||!kit.on)return;
    var text=(extra?extra+" ":"")+(kit.text||"");
    ev.push({id:kind+"-"+Math.round(t/60000),kind:kind,t:t,zone:zone,title:title,text:text.trim(),grp:grp,alt:grp.alt||null});
  }
  var pre={key:o.tag+"-pre",name:"Before you fly",zone:o.oz,city:oc};
  add("sustain",o.dep-100*60000,o.oz,"Fish oil with your meal",pre,"Eat before boarding or just after takeoff.");
  add("protect",o.dep-120*60000,o.oz,"Vitamin C",pre);
  add("socks",o.dep-75*60000,o.oz,"Compression socks",pre);
  add("water",o.dep-60*60000,o.oz,"Water + electrolytes",pre,"Keep sipping in the air.");
  var air={key:o.tag+"-air",name:"In the air",zone:o.oz,city:oc,alt:{zone:o.dz,city:dc}};
  var ts=o.dep+90*60000, hs=hourOf(o.dz,ts);
  if(east&&o.hrs>=6&&(hs>=22||hs<=5)){
    add("glasses",ts-30*60000,o.oz,"Amber glasses + mask",air);
    add("mellow",ts,o.oz,"Melatonin + magnesium",air,"Settle in to sleep.");
  }
  add("protect",land-180*60000,o.oz,"Vitamin C, second dose",air,"With your meal.");
  add("sustain",land-175*60000,o.oz,"Fish oil, second dose",air);
  add("reset",land-60*60000,o.oz,"Pre-landing reset",air);
  add("water",land-60*60000,o.oz,"Water before landing",air);
  var pa=parts(o.dz,land), bedM=S.bedM<720?S.bedM+1440:S.bedM;
  var dmax=Math.min(adj,o.maxDay);
  for(var d=0;d<=dmax;d++){(function(d){
    var at=function(h,m){return localToUTC(o.dz,pa.year,pa.month,pa.day+d,h,m)};
    var grp={key:o.tag+"-d"+d,name:d===0?"Arrival day":"Day "+(d+1),zone:o.dz,city:dc};
    var bed=at(Math.floor(bedM/60),bedM%60);
    var ok=function(t){return d>0||t>land+20*60000};
    var t;
    if(d===1)add("coffee",at(8,30),o.dz,"Coffee",grp);
    if(east){
      var hr=(abs>8&&d<2)?10:8, extra=(abs>8&&d<2)?"Waiting until 10:00 because you crossed more than 8 zones east.":"";
      if(d===0){t=Math.max(at(hr,0),land+60*60000);if(hourOf(o.dz,t)<(hr<10?11:13))add("light",t,o.dz,"Morning light",grp,extra)}
      else add("light",at(hr,0),o.dz,"Morning light",grp,extra);
    }else{
      t=at(16,30);if(ok(t))add("light",t,o.dz,"Afternoon light",grp,"Skip early-morning sun for now.");
    }
    t=bed-8*36e5;if(ok(t))add("caffeine",t,o.dz,"Caffeine cutoff",grp);
    t=bed-120*60000;if(ok(t))add("glasses",t,o.dz,"Blue-light glasses",grp);
    t=bed-30*60000;
    if(d===0&&t<land+30*60000)t=land+60*60000;
    if(d<=2&&(d>0||t<bed+180*60000))add("mellow",t,o.dz,"Melatonin + magnesium",grp);
  })(d)}
  ev.sort(function(a,b){return a.t-b.t});
  var counts={};
  ev=ev.filter(function(x){
    var cap=capFor(S.kit[x.kind].qty,o.tag,S);
    counts[x.kind]=(counts[x.kind]||0)+1;
    return counts[x.kind]<=cap;
  });
  return {events:ev,info:info};
}

function buildPlan(S){
  var m=/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(S.dep||"");
  if(!m||S.from===S.to)return {events:[],info:null,ret:null};
  var dep1=localToUTC(S.from,+m[1],+m[2],+m[3],+m[4],+m[5]);
  var l1=genLeg({oz:S.from,dz:S.to,dep:dep1,hrs:S.hours,tag:"out",maxDay:S.nights>0?Math.max(0,S.nights-1):9},S);
  var events=l1.events.slice(), ret=null;
  if(S.nights>0){
    var pa=parts(S.to,dep1+S.hours*36e5), rm=hm(S.retTime,11,0), rz=S.retFrom||S.to;
    var dep2=localToUTC(rz,pa.year,pa.month,pa.day+S.nights,Math.floor(rm/60),rm%60);
    ret=dep2;
    var l2=genLeg({oz:rz,dz:S.from,dep:dep2,hrs:S.retHours,tag:"ret",maxDay:9},S);
    events=events.concat(l2.events);
  }
  events.sort(function(a,b){return a.t-b.t});
  return {events:events,info:l1.info,dep:dep1,ret:ret};
}
if(typeof module!=="undefined")module.exports={ZONES:ZONES,buildPlan:buildPlan,genLeg:genLeg,KITS:KITS,localToUTC:localToUTC,offsetMin:offsetMin,fmtT:fmtT,fmtD:fmtD};
