/* Matchdesk model: everything that turns API-Football data into ranked picks.
   Pure functions only (no DOM, no fetch), shared by the page and by the server's daily job (run in Jint).
   Keep it ES2015 and free of browser APIs. */
"use strict";
// league averages from the standings table, and goals per game of every team whose stats were seen
var leagueTable=new Map();
var standingRanks=new Map();
function num(v){
 if(v===null||v===undefined||v==="")return null;
 var n=Number(String(v).replace("%","").replace("+",""));
 return Number.isFinite(n)?n:null;
}
function pct(v){var n=num(v);return n===null?null:(String(v).indexOf("%")>=0?n:(n<=1?n*100:n))}
function poisson(k,lambda){
 var p=Math.exp(-lambda);
 for(var i=1;i<=k;i++)p*=lambda/i;
 return p;
}
function poissonArray(lambda,max){var a=[];for(var i=0;i<=max;i++)a.push(poisson(i,lambda));return a}
var DC_RHO=-0.1;
function dcTau(i,j,h,a){
 if(i===0&&j===0)return 1-h*a*DC_RHO;
 if(i===0&&j===1)return 1+h*DC_RHO;
 if(i===1&&j===0)return 1+a*DC_RHO;
 if(i===1&&j===1)return 1-DC_RHO;
 return 1;
}
// Goals are a little more bunched than independent Poisson: mix over a shared scale so totals get a fatter tail.
// Mean is unchanged (weights average to 1). The spread is a judgement call, not fitted: check it against the pick log.
var DISPERSION=.12;
function modelFromLambdas(h,a){
 if(!(h>=0&&a>=0))return null;
 var scales=[[1-DISPERSION,.25],[1,.5],[1+DISPERSION,.25]],acc={},sum=0;
 scales.forEach(function(sc){
  var hh=h*sc[0],aa=a*sc[0],ph=poissonArray(hh,10),pa=poissonArray(aa,10);
  for(var i=0;i<ph.length;i++)for(var j=0;j<pa.length;j++){
   var q=sc[1]*ph[i]*pa[j]*Math.max(0,dcTau(i,j,hh,aa)),key=i*20+j;
   acc[key]=(acc[key]||0)+q;sum+=q;
  }
 });
 var home=0,draw=0,away=0,best={p:-1,h:0,a:0},outcomes=[];
 Object.keys(acc).forEach(function(key){
  var i=Math.floor(key/20),j=key%20,pr=acc[key]/sum;
  outcomes.push({home:i,away:j,total:i+j,diff:i-j,p:pr});
  if(i>j)home+=pr;else if(i===j)draw+=pr;else away+=pr;
  if(pr>best.p)best={p:pr,h:i,a:j};
 });
 return {home:home,draw:draw,away:away,score:best,lambdaHome:h,lambdaAway:a,total:h+a,outcomes:outcomes};
}
function splitLines(line){
 var twice=Number(line)*2;
 if(Math.abs(twice-Math.round(twice))<1e-8)return [Math.round(twice)/2];
 return [Math.floor(twice)/2,Math.ceil(twice)/2];
}
function settlement(model,line,type,side,odds){
 if(!model||!model.outcomes)return null;
 var components=splitLines(Number(line)),fullWin=0,halfWin=0,push=0,halfLoss=0,fullLoss=0,winStake=0,pushStake=0;
 model.outcomes.forEach(function(o){
  var wins=0,pushes=0,losses=0;
  components.forEach(function(component){
   var delta;
   if(type==="handicap"){
    delta=(side==="home"?o.diff:-o.diff)+component;
   }else{
    delta=side==="over"?o.total-component:component-o.total;
   }
   if(delta>1e-8)wins+=1/components.length;
   else if(delta< -1e-8)losses+=1/components.length;
   else pushes+=1/components.length;
  });
  if(wins>=.999)fullWin+=o.p;
  else if(wins>0)halfWin+=o.p;
  else if(pushes>=.999)push+=o.p;
  else if(pushes>0&&losses>0)halfLoss+=o.p;
  else fullLoss+=o.p;
  winStake+=o.p*wins;pushStake+=o.p*pushes;
 });
 var ev=Number.isFinite(Number(odds))&&Number(odds)>1?(winStake*Number(odds)+pushStake-1)*100:null;
 return {fullWin:fullWin,halfWin:halfWin,push:push,halfLoss:halfLoss,fullLoss:fullLoss,win:fullWin+halfWin,loss:halfLoss+fullLoss,ev:ev,winStake:winStake,pushStake:pushStake};
}
function firstResponse(data){var r=data&&data.response;return Array.isArray(r)?(r[0]||null):(r||null)}
function goalAverages(stats){
 if(!stats||!stats.goals)return null;
 var gf=stats.goals.for||{},ga=stats.goals.against||{};
 var avg=function(primary,fallback){var n=num(primary);return n===null?num(fallback):n};
 return {forHome:avg(gf.average&&gf.average.home,gf.average&&gf.average.total),forAway:avg(gf.average&&gf.average.away,gf.average&&gf.average.total),
 againstHome:avg(ga.average&&ga.average.home,ga.average&&ga.average.total),againstAway:avg(ga.average&&ga.average.away,ga.average&&ga.average.total)};
}
function formFactor(stats){
 if(!stats||typeof stats.form!=="string")return 1;
 var recent=stats.form.replace(/[^WDL]/g,"").slice(-6);
 if(recent.length<3)return 1;
 var pts=function(str){return str.split("").reduce(function(t,c){return t+(c==="W"?1:c==="D"?.5:0)},0)/str.length};
 var f=stats.fixtures||{},played=f.played&&num(f.played.total),wins=f.wins&&num(f.wins.total),draws=f.draws&&num(f.draws.total);
 if(!played||wins===null||draws===null)return 1;
 var season=(wins+draws*.5)/played;
 return Math.max(.88,Math.min(1.12,1+.25*(pts(recent)-season)));
}
var SHRINK_GAMES=5,LEAGUE_PRIOR={home:1.45,away:1.15},LEAGUE_PRIOR_WEIGHT=4;
// goals per game by team for every league whose team stats were fetched in this session
var leagueGoals=new Map();
function noteLeagueTeam(stats){
 var g=goalAverages(stats);
 if(!g||!stats.league||!stats.team)return;
 var teams=leagueGoals.get(stats.league.id)||new Map();
 teams.set(stats.team.id,{home:g.forHome,away:g.forAway});
 leagueGoals.set(stats.league.id,teams);
}

function noteStandings(leagueId,data){
 var root=firstResponse(data),ranks=new Map();
 ((root&&root.league&&root.league.standings)||[]).forEach(function(group){(group||[]).forEach(function(row){
  if(row&&row.team&&Number.isFinite(Number(row.rank)))ranks.set(row.team.id,Number(row.rank));
 })});
 if(ranks.size)standingRanks.set(leagueId,ranks);
}

function leagueAverage(leagueId){
 if(leagueTable.get(leagueId))return leagueTable.get(leagueId);
 var teams=leagueGoals.get(leagueId),sumH=0,sumA=0,n=0,k=LEAGUE_PRIOR_WEIGHT;
 if(teams)teams.forEach(function(t){if(t.home!==null&&t.away!==null){sumH+=t.home;sumA+=t.away;n++}});
 return {home:(sumH+LEAGUE_PRIOR.home*k)/(n+k),away:(sumA+LEAGUE_PRIOR.away*k)/(n+k),teams:n};
}
function played(stats,side){var p=stats&&stats.fixtures&&stats.fixtures.played;return p?(num(p[side])||0):0}
function shrink(rate,games,prior){return rate===null||rate===undefined?prior:(rate*games+prior*SHRINK_GAMES)/(games+SHRINK_GAMES)}
function modelFromTeamStats(homeStatsData,awayStatsData,adj){
 var hst=firstResponse(homeStatsData),ast=firstResponse(awayStatsData);
 var hs=goalAverages(hst),as=goalAverages(ast);
 if(!hs||!as)return null;
 noteLeagueTeam(hst);noteLeagueTeam(ast);
 var lg=leagueAverage((hst.league&&hst.league.id)||(ast.league&&ast.league.id));
 var choose=function(a,b){return a!==null&&a!==undefined?a:b};
 var hn=played(hst,"home"),an=played(ast,"away");
 // home sides score lg.home per game, so the away team's conceding rate is measured against lg.home (and vice versa)
 adj=adj||{};
 // recent xG (when fetched) is averaged with the season goal rate: it is less noisy than goals over few games
 var hx=adj.homeXg,ax=adj.awayXg;
 var mix=function(rate,x){return x===null||x===undefined?rate:(rate===null||rate===undefined?x:(rate+x)/2)};
 // last-10 goals, recency weighted, restated for this venue via the league average; 30% weight once there are 5+ matches
 var avgLg=(lg.home+lg.away)/2,hr=adj.homeRecent,ar=adj.awayRecent;
 var recent=function(rate,r,key,venueAvg){
  if(!r||r.n<5||rate===null||rate===undefined)return rate;
  var eq=r[key]/avgLg*venueAvg;
  return Number.isFinite(eq)?.7*rate+.3*eq:rate;
 };
 var hAtt=shrink(recent(mix(choose(hs.forHome,hs.forAway),hx&&hx.for),hr,"for",lg.home),hn,lg.home)/lg.home;
 var aDef=shrink(recent(mix(choose(as.againstAway,as.againstHome),ax&&ax.against),ar,"against",lg.home),an,lg.home)/lg.home;
 var aAtt=shrink(recent(mix(choose(as.forAway,as.forHome),ax&&ax.for),ar,"for",lg.away),an,lg.away)/lg.away;
 var hDef=shrink(recent(mix(choose(hs.againstHome,hs.againstAway),hx&&hx.against),hr,"against",lg.away),hn,lg.away)/lg.away;
 // players ruled out lower that side's scoring rate
 var lh=lg.home*hAtt*aDef*(adj.homeAtt||1),la=lg.away*aAtt*hDef*(adj.awayAtt||1);
 if(!Number.isFinite(lh)||!Number.isFinite(la)||lh<0||la<0)return null;
 var model=modelFromLambdas(lh*formFactor(hst),la*formFactor(ast));
 if(model){model.games=Math.min(played(hst,"total"),played(ast,"total"));model.league=lg;model.adj=adj}
 return model;
}
// injuries: "Missing Fixture" counts 1, anything else (questionable) 0.5; -2.5% scoring per count, at most -12%
function injuryInfo(data,teamId){
 var out=[],doubt=[];
 ((data&&data.response)||[]).forEach(function(r){
  if(!r.team||r.team.id!==teamId||!r.player)return;
  var item=r.player.name+(r.player.reason?" ("+r.player.reason+")":"");
  if(r.player.type==="Missing Fixture")out.push(item);else doubt.push(item);
 });
 return {out:out,doubt:doubt,factor:1-Math.min(.12,.025*(out.length+doubt.length*.5))};
}

// lineups are announced about an hour before kickoff: true/false once close to kickoff, null while it is still early
function lineupsKnown(lineupData,kickoff){
 if(lineupData&&lineupData.response&&lineupData.response.length>=2)return true;
 return new Date(kickoff)-Date.now()<3*3600e3?false:null;
}
// back-to-back games: playing again within 3.5 days costs about 3% of scoring
function restInfo(lastDate,kickoff){
 if(!lastDate)return {days:null,factor:1};
 var days=(new Date(kickoff)-new Date(lastDate))/864e5;
 return {days:days,factor:days<3.5?.97:1};
}
function buildAdj(injData,fixture,homeInfo,awayInfo,lineups){
 var hi=injuryInfo(injData,fixture.teams.home.id),ai=injuryInfo(injData,fixture.teams.away.id);
 var hr=restInfo(homeInfo&&homeInfo.lastDate,fixture.fixture.date),ar=restInfo(awayInfo&&awayInfo.lastDate,fixture.fixture.date);
 return {homeAtt:hi.factor*hr.factor,awayAtt:ai.factor*ar.factor,homeInj:hi,awayInj:ai,
  homeXg:homeInfo&&homeInfo.xg,awayXg:awayInfo&&awayInfo.xg,homeRecent:homeInfo&&homeInfo.recent,awayRecent:awayInfo&&awayInfo.recent,
  homeRest:hr.days,awayRest:ar.days,lineups:lineups};
}

function ladderKey(n){var v=Math.round(Number(n)*100)/100;if(v===0)v=0;return String(v)}
// change (in points) of the market probability of this pick between the first and last tracked snapshot
function marketMove(entry,snaps){
 if(!snaps||snaps.length<2||!entry.kind)return null;
 var k=ladderKey(entry.ladder);
 var vals=snaps.map(function(sn){
  var l=entry.kind==="AH"?(sn.ah&&sn.ah[k]):(sn.ou&&sn.ou[k]);
  if(l===undefined||l===null)return null;
  return entry.side==="home"||entry.side==="over"?l:1-l;
 }).filter(function(v){return v!==null});
 return vals.length>=2?(vals[vals.length-1]-vals[0])*100:null;
}

function impliedOdds(odd){var o=num(odd);return o&&o>1?1/o:null}
function normalizeMarket(raw){
 if(!raw||raw.home===undefined||raw.draw===undefined||raw.away===undefined)return null;
 var total=raw.home+raw.draw+raw.away;
 return total>0?{home:raw.home/total,draw:raw.draw/total,away:raw.away/total}:null;
}
function findOutcome(value,homeName,awayName){
 var s=String(value||"").trim().toLowerCase();
 if(s==="draw"||s==="tie"||s==="x")return "draw";
 if(s==="home"||s==="1"||s.indexOf(homeName.toLowerCase())>=0)return "home";
 if(s==="away"||s==="2"||s.indexOf(awayName.toLowerCase())>=0)return "away";
 return null;
}
function parseMarkets(data,homeName,awayName){
 var first=firstResponse(data),records=(first&&first.bookmakers)||[];
 var one=[],ou={},ah={},bestPrices={home:{odd:0,book:""},draw:{odd:0,book:""},away:{odd:0,book:""}};
 records.forEach(function(book){
  var bets=book.bets||[];
  var bet=bets.find(function(b){var n=(b.name||"").toLowerCase();return n.indexOf("match winner")>=0||n==="1x2"||n==="fulltime result"});
  if(bet){
   var raw={home:0,draw:0,away:0},prices={home:null,draw:null,away:null};
   (bet.values||[]).forEach(function(v){var outcome=findOutcome(v.value,homeName,awayName),price=num(v.odd),p=impliedOdds(v.odd);if(outcome&&p){raw[outcome]=p;prices[outcome]=price}});
   var norm=normalizeMarket(raw);if(norm&&prices.home&&prices.draw&&prices.away){
    one.push({home:norm.home,draw:norm.draw,away:norm.away,rawHome:prices.home,rawDraw:prices.draw,rawAway:prices.away});
    ["home","draw","away"].forEach(function(outcome){if(prices[outcome]>bestPrices[outcome].odd)bestPrices[outcome]={odd:prices[outcome],book:book.name}});
   }
  }
  bets.forEach(function(b){
   var n=(b.name||"").toLowerCase();
   var isTotal=(n.indexOf("over/under")>=0||n.indexOf("over under")>=0||n==="over/under"||n.indexOf("total goals")>=0);
   if(!isTotal||/first half|1st half|second half|2nd half|extra time|corner/.test(n))return;
   var groups={};
   (b.values||[]).forEach(function(v){
    var label=String(v.value||"").toLowerCase(),m=label.match(/(over|under).*?([0-9]+(?:\.[0-9]+)?)/);
    if(!m){m=label.match(/([0-9]+(?:\.[0-9]+)?).*?(over|under)/);if(m)m=[m[0],m[2],m[1]]}
    if(!m)return;
    var line=m[2],side=m[1],price=num(v.odd),p=impliedOdds(v.odd);
    if(!p)return;
    groups[line]=groups[line]||{over:0,under:0,overOdd:null,underOdd:null};
    groups[line][side]=p;groups[line][side+"Odd"]=price;
   });
   Object.keys(groups).forEach(function(line){
    var pair=groups[line],sum=pair.over+pair.under;
    if(sum>0&&pair.overOdd&&pair.underOdd){
     ou[line]=ou[line]||[];ou[line].push({over:pair.over/sum,under:pair.under/sum,overOdd:pair.overOdd,underOdd:pair.underOdd,book:book.name});
    }
   });
  });
  var ahBet=bets.find(function(b){return (b.name||"").trim().toLowerCase()==="asian handicap"});
  if(ahBet){
   var homeOdds={},awayOdds={};
   (ahBet.values||[]).forEach(function(v){
    var m=String(v.value||"").trim().match(/^(home|away)\s*\(?\s*([+-]?\d+(?:\.\d+)?)\s*\)?$/i);
    var price=num(v.odd);if(!m||!price||price<=1)return;
    var k=String(Math.round(Number(m[2])*100)/100);
    (m[1].toLowerCase()==="home"?homeOdds:awayOdds)[k]=price;
   });
   // Bookmakers label the away side either with the home line ("Away -0.5" = away +0.5) or with its own line.
   // Pick, per bookmaker, the pairing whose prices form a sane two-way market (overround 0-15%).
   var sane=function(h,a){var o=1/h+1/a;return o>=1&&o<=1.15};
   var flip=function(k){return String(Math.round(-Number(k)*100)/100)};
   var pairs=function(sameLabel){return Object.keys(homeOdds).map(function(k){var a=awayOdds[sameLabel?k:flip(k)];return a&&sane(homeOdds[k],a)?{line:k,homeOdd:homeOdds[k],awayOdd:a}:null}).filter(Boolean)};
   var same=pairs(true),own=pairs(false),chosen=same.length>own.length?same:own;
   chosen.forEach(function(pair){
    var hp=1/pair.homeOdd,ap=1/pair.awayOdd,sum=hp+ap;
    ah[pair.line]=ah[pair.line]||[];
    ah[pair.line].push({home:hp/sum,away:ap/sum,homeOdd:pair.homeOdd,awayOdd:pair.awayOdd,book:book.name});
   });
  }
 });
 var mean=function(arr,key){return arr.length?arr.reduce(function(s,x){return s+x[key]},0)/arr.length:null};
 var pinnacle=function(arr){return arr.find(function(x){return /pinnacle/i.test(x.book||"")})};
 var anchorVal=function(arr,key){var pin=pinnacle(arr);return pin?pin[key]:mean(arr,key)};
 var median=function(arr,key){if(!arr.length)return null;var v=arr.map(function(x){return x[key]}).sort(function(a,b){return a-b}),m=v.length>>1;return v.length%2?v[m]:(v[m-1]+v[m])/2};
 var avg=one.length?{home:mean(one,"home"),draw:mean(one,"draw"),away:mean(one,"away"),rawHome:mean(one,"rawHome"),rawDraw:mean(one,"rawDraw"),rawAway:mean(one,"rawAway"),bestHome:bestPrices.home.odd,homeBook:bestPrices.home.book,bestDraw:bestPrices.draw.odd,drawBook:bestPrices.draw.book,bestAway:bestPrices.away.odd,awayBook:bestPrices.away.book,books:one.length}:null;
 var ouAvg={};Object.keys(ou).forEach(function(line){
  var arr=ou[line],bestOver={odd:0,book:""},bestUnder={odd:0,book:""};
  arr.forEach(function(x){if(x.overOdd>bestOver.odd)bestOver={odd:x.overOdd,book:x.book};if(x.underOdd>bestUnder.odd)bestUnder={odd:x.underOdd,book:x.book}});
  ouAvg[line]={over:anchorVal(arr,"over"),under:anchorVal(arr,"under"),anchor:pinnacle(arr)?"Pinnacle":"เฉลี่ย",bestOver:bestOver.odd,overBook:bestOver.book,bestUnder:bestUnder.odd,underBook:bestUnder.book,medOver:median(arr,"overOdd"),medUnder:median(arr,"underOdd"),books:arr.length};
 });
 var ahAvg={};Object.keys(ah).forEach(function(line){
  var arr=ah[line],bestHome={odd:0,book:""},bestAway={odd:0,book:""};
  arr.forEach(function(x){if(x.homeOdd>bestHome.odd)bestHome={odd:x.homeOdd,book:x.book};if(x.awayOdd>bestAway.odd)bestAway={odd:x.awayOdd,book:x.book}});
  ahAvg[line]={home:anchorVal(arr,"home"),away:anchorVal(arr,"away"),anchor:pinnacle(arr)?"Pinnacle":"เฉลี่ย",bestHome:bestHome.odd,homeBook:bestHome.book,bestAway:bestAway.odd,awayBook:bestAway.book,medHome:median(arr,"homeOdd"),medAway:median(arr,"awayOdd"),books:arr.length};
 });
 return {oneXtwo:avg,overUnder:ouAvg,asianHandicap:ahAvg};
}

function formatHandicap(n){
 n=Number(n);if(Math.abs(n)<1e-8)return "0";
 return (n>0?"+":"")+String(Math.round(n*100)/100);
}

var MARKET_WEIGHT=.7,MARKET_WEIGHT_MAX=.9,MIN_CONF=50,KELLY_FRACTION=.25,KELLY_CAP=.05;
// What a pick must pass to be ranked. Bookmakers are better calibrated than a goals model on long shots
// (favourite-longshot bias), so the market weight grows with the price and long shots are not ranked at all.
var MOVE_AGAINST=3,MIN_ODDS=1.7,MAX_ODDS=2.5,MIN_PMARKET=.3,MIN_EV=2,MAX_EV=12,MAX_EV_OU=8,MAX_GAP=.12,MAX_PRICE_RATIO=1.12;
// market weight: 70% up to price 2.2, rising 10 points per +1.0 of price, at most 90%
function marketWeight(odds){return Math.min(MARKET_WEIGHT_MAX,MARKET_WEIGHT+Math.max(0,odds-2.2)*.1)}
// fractional Kelly as % of bankroll, capped; 0 when there is no edge
function kellyPct(p,odds){
 if(!(odds>1)||!Number.isFinite(p))return 0;
 var f=(p*odds-1)/(odds-1);
 return f>0?Math.min(KELLY_CAP,f*KELLY_FRACTION)*100:0;
}
// Model EV -> price-equivalent win probability, blended with the de-margined market probability for the same side.
function blendEv(evModel,odds,pMarket){
 if(evModel===null||evModel===undefined||!(odds>1))return null;
 var pModel=(evModel/100+1)/odds;
 var w=marketWeight(odds),pBlend=pMarket===null||pMarket===undefined?pModel:w*pMarket+(1-w)*pModel;
 return {p:pBlend,pModel:pModel,pMarket:pMarket,ev:(pBlend*odds-1)*100};
}
// 0-100: bookmaker coverage, games behind the stats, and how far the model sits from the market
function confidence(books,games,gap,lineups){
 var b=Math.min((books||0)/5,1),g=Math.min((games||0)/8,1),d=gap===null||gap===undefined?0:Math.max(0,1-gap/.15);
 return Math.round(100*(.35*b+.35*g+.3*d)*(lineups===false?.9:1));
}

function allValueEntries(prob,markets,model,homeName,awayName){
 var games=model?model.games:0;
 var entries=[];
 var add=function(category,label,metric,odds,book,pMarket,books,ahLine,medOdds,extra){
  extra=extra||{};
  var b=metric?blendEv(metric.ev,odds,pMarket):null;
  if(!b)return;
  entries.push({category:category,label:label,p:b.p,pModel:b.pModel,pMarket:pMarket,pLabel:"โอกาสเทียบราคา",push:metric.push,ev:b.ev,evModel:metric.ev,kelly:kellyPct(b.p,odds),ahLine:ahLine,ws:metric.winStake,ps:metric.pushStake,odds:odds,book:book,priceRatio:medOdds>1?odds/medOdds:1,ouMain:extra.ouMain===undefined?true:extra.ouMain,anchor:extra.anchor,kind:extra.kind,side:extra.side,ladder:extra.ladder,conf:confidence(books,games,Math.abs(b.pModel-pMarket),model&&model.adj&&model.adj.lineups)});
 };
 if(model&&markets&&markets.overUnder){
  // side lines have few bookmakers and unsteady prices: only the line priced closest to even is ranked
  var mainLine=Object.keys(markets.overUnder).reduce(function(best,l){var d=Math.abs(markets.overUnder[l].over-.5);return !best||d<best.d?{line:l,d:d}:best},null);
  Object.keys(markets.overUnder).forEach(function(line){var m=markets.overUnder[line],main={ouMain:mainLine&&line===mainLine.line};
   add("สูง/ต่ำ","สูง "+line,settlement(model,line,"total","over",m.bestOver),m.bestOver,m.overBook,m.over,m.books,undefined,m.medOver,Object.assign({kind:"OU",side:"over",ladder:Number(line)},main,{anchor:m.anchor}));
   add("สูง/ต่ำ","ต่ำ "+line,settlement(model,line,"total","under",m.bestUnder),m.bestUnder,m.underBook,m.under,m.books,undefined,m.medUnder,Object.assign({kind:"OU",side:"under",ladder:Number(line)},main,{anchor:m.anchor}));
  });
 }
 if(model&&markets&&markets.asianHandicap){
  Object.keys(markets.asianHandicap).forEach(function(line){
   var h=Number(line),m=markets.asianHandicap[line];
   add("แฮนดิแคป",homeName+" "+formatHandicap(h),settlement(model,h,"handicap","home",m.bestHome),m.bestHome,m.homeBook,m.home,m.books,h,m.medHome,{kind:"AH",side:"home",ladder:h,anchor:m.anchor});
   add("แฮนดิแคป",awayName+" "+formatHandicap(-h),settlement(model,-h,"handicap","away",m.bestAway),m.bestAway,m.awayBook,m.away,m.books,-h,m.medAway,{kind:"AH",side:"away",ladder:h,anchor:m.anchor});
  });
 }
 return entries.sort(function(a,b){return b.ev-a.ev});
}

// why a pick is not ranked (null = it passes); the first failing rule wins
function rejectReason(x){
 if(x.odds<MIN_ODDS)return "short";
 if(x.odds>MAX_ODDS||x.pMarket<MIN_PMARKET)return "longshot";
 if(x.ouMain===false)return "line";
 if(x.ev>(x.category==="สูง/ต่ำ"?MAX_EV_OU:MAX_EV))return "ev";
 if(Math.abs(x.pModel-x.pMarket)>MAX_GAP)return "gap";
 if(x.priceRatio>MAX_PRICE_RATIO)return "outlier";
 if(x.move!==null&&x.move!==undefined&&x.move<=-MOVE_AGAINST)return "against";
 if(x.conf<MIN_CONF)return "conf";
 return null;
}
function rankable(x){return rejectReason(x)===null&&x.ev>=MIN_EV}

// standings -> goals per game of home and away sides over the whole table (cups have none)
function noteLeagueTable(leagueId,data){
 var avg=null,root=firstResponse(data),seen={},hf=0,hp=0,af=0,ap=0;
 ((root&&root.league&&root.league.standings)||[]).forEach(function(group){(group||[]).forEach(function(row){
  if(!row.team||seen[row.team.id]||!row.home||!row.away)return;
  seen[row.team.id]=1;
  hf+=num(row.home.goals.for)||0;hp+=num(row.home.played)||0;af+=num(row.away.goals.for)||0;ap+=num(row.away.played)||0;
 })});
 if(hp>=10&&ap>=10)avg={home:hf/hp,away:af/ap,teams:Object.keys(seen).length,fromTable:true};
 leagueTable.set(leagueId,avg);
 return avg;
}
// a team's last matches -> recency-weighted goals for/against and the date of its last game
function teamInfoFrom(lastData,teamId){
 var done=((lastData&&lastData.response)||[]).filter(function(f){return ["FT","AET","PEN"].indexOf(f.fixture.status.short)>=0&&f.goals&&f.goals.home!==null&&f.goals.away!==null})
  .sort(function(a,b){return new Date(b.fixture.date)-new Date(a.fixture.date)});
 var sw=0,sf=0,sa=0;
 done.forEach(function(f,k){
  var w=Math.pow(.85,k),mine=f.teams.home.id===teamId?f.goals.home:f.goals.away,theirs=f.teams.home.id===teamId?f.goals.away:f.goals.home;
  sw+=w;sf+=w*mine;sa+=w*theirs;
 });
 return {recent:sw?{for:sf/sw,against:sa/sw,n:done.length}:null,lastDate:done[0]?done[0].fixture.date:null,xg:null,done:done};
}
/* One fixture, start to finish. in = {fixture, odds, homeStats, awayStats, injuries, homeInfo, awayInfo, lineups, snaps}
   (homeInfo/awayInfo from teamInfoFrom, optionally with .xg; lineups from lineupsKnown; snaps = odds history or null).
   Returns the model, every priced option, and the best rankable pick per market. */
function analyseFixture(input){
 var f=input.fixture,home=f.teams.home.name,away=f.teams.away.name;
 var markets=parseMarkets(input.odds,home,away);
 var model=modelFromTeamStats(input.homeStats,input.awayStats,buildAdj(input.injuries,f,input.homeInfo,input.awayInfo,input.lineups));
 var entries=allValueEntries(null,markets,model,home,away);
 entries.forEach(function(e){e.move=input.snaps?marketMove(e,input.snaps):null});
 var best=function(ou){return entries.filter(function(x){return (x.category==="สูง/ต่ำ")===ou&&rankable(x)})[0]||null};
 return {model:model,entries:entries,bestHandicap:best(false),bestOverUnder:best(true)};
}
// the shape the server stores (same as the page sends to /api/picks/log)
function pickRecord(fixtureId,e){
 return {fixtureId:fixtureId,market:e.kind,side:e.side,line:e.kind==="AH"?e.ahLine:e.ladder,ladderLine:e.ladder,
  label:e.category+" "+e.label,odds:e.odds,book:e.book||null,pModel:e.pModel,pMarket:e.pMarket,pBlend:e.p,ev:e.ev,conf:e.conf};
}
