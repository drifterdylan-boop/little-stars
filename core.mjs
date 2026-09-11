export const KEY='little-stars:v1';
export const ICONS=['📘','🔢','📖','✍️','🎹','🎨','🏃','⚽️','🏊','🚲','🪥','🛁','🧼','🧹','🧺','🌱','💧','🥛','🍎','🥗','💊','😴','🛏️','⏰','👕','🎒','🤝','❤️','🎮','🧩','🎬','🎵','📺','🎁','🍦','🧸','🎡','🏕️','🏖️'];
export function dayKey(date=new Date()){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
export function monthBoard(year,month,completions){
 if(!Number.isSafeInteger(year)||!Number.isSafeInteger(month)||month<0||month>11||!Array.isArray(completions))throw Error('月份信息无效。');
 const daysInMonth=new Date(year,month+1,0).getDate(),prefix=(new Date(year,month,1).getDay()+6)%7,counts=new Map();
 for(const c of completions){const d=new Date(c.day+'T12:00:00');if(d.getFullYear()===year&&d.getMonth()===month)counts.set(c.day,(counts.get(c.day)||0)+1);}
 const days=Array.from({length:daysInMonth},(_,i)=>{const day=i+1,key=dayKey(new Date(year,month,day));return{day,key,stars:counts.get(key)||0};});
 return{year,month,prefix,days,totalStars:days.reduce((n,d)=>n+d.stars,0),activeDays:days.filter(d=>d.stars>0).length};
}
export function uid(){return globalThis.crypto.randomUUID();}
export function fresh(){return {version:1,tasks:[{id:uid(),name:'英语学习',icon:'📘',active:true},{id:uid(),name:'数学练习',icon:'🔢',active:true},{id:uid(),name:'语文阅读',icon:'📖',active:true}],rewards:[{id:uid(),name:'选一份喜欢的小点心',icon:'🍦',threshold:10,active:true},{id:uid(),name:'一次家庭电影之夜',icon:'🎬',threshold:30,active:true},{id:uid(),name:'一次期待的周末出游',icon:'🎡',threshold:60,active:true}],completions:[],claims:[]};}
export function validate(s){
 if(!s||s.version!==1||!Array.isArray(s.tasks)||!Array.isArray(s.rewards)||!Array.isArray(s.completions)||!Array.isArray(s.claims))throw Error('这不是有效的星星打卡备份。');
 if(s.tasks.length>1000||s.rewards.length>1000||s.completions.length>200000||s.claims.length>1000)throw Error('备份记录过多。');
 const ids=new Set();for(const x of [...s.tasks,...s.rewards]){if(!x||typeof x.id!=='string'||!x.id||x.id.length>100||ids.has(x.id)||typeof x.name!=='string'||!x.name.trim()||x.name.length>40||!ICONS.includes(x.icon)||typeof x.active!=='boolean')throw Error('任务或奖励信息不完整。');ids.add(x.id);}
 const taskIds=new Set(s.tasks.map(x=>x.id)),rewardIds=new Set(s.rewards.map(x=>x.id));
 for(const r of s.rewards)if(!Number.isSafeInteger(r.threshold)||r.threshold<1||r.threshold>99999)throw Error('奖励星星数应为 1 到 99999 的整数。');
 const days=new Set();for(const c of s.completions){if(!c||!taskIds.has(c.taskId)||!validDay(c.day)||!Number.isFinite(c.at)||days.has(c.taskId+':'+c.day))throw Error('打卡记录无效或重复。');days.add(c.taskId+':'+c.day);}
 const claims=new Set();for(const c of s.claims){if(!c||!rewardIds.has(c.rewardId)||claims.has(c.rewardId)||!Number.isFinite(c.at))throw Error('奖励领取记录无效。');claims.add(c.rewardId);}
 return s;
}
function validDay(d){if(typeof d!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(d))return false;const dt=new Date(d+'T12:00:00Z');return !isNaN(dt)&&dt.toISOString().slice(0,10)===d;}
export function complete(s,id,day=dayKey(),at=Date.now()){
 if(!s.tasks.some(t=>t.id===id&&t.active))throw Error('这个任务已暂停。');
 if(s.completions.some(c=>c.taskId===id&&c.day===day))return false;
 s.completions.push({taskId:id,day,at});return true;
}
export function cancelCompletion(s,id,day=dayKey(),expectedAt=null){
 const i=s.completions.findIndex(c=>c.taskId===id&&c.day===day);
 if(i===-1)return false;
 if(expectedAt!==null&&s.completions[i].at!==expectedAt)throw Error('这项打卡已更新，请刷新后重试。');
 s.completions.splice(i,1);return true;
}
export function claim(s,id,at=Date.now()){
 const r=s.rewards.find(r=>r.id===id&&r.active);if(!r)throw Error('这个奖励已移除。');
 if(s.claims.some(c=>c.rewardId===id))throw Error('这个奖励已经领取过啦。');
 if(s.completions.length<r.threshold)throw Error('星星还不够，再努力一下吧。');
 s.claims.push({rewardId:id,at});return r.name;
}
export function saveItem(s,type,id,name,icon,threshold){
 if(!['tasks','rewards'].includes(type))throw Error('类型无效。');
 name=String(name).trim();if(!name||name.length>40)throw Error('请填写 1 到 40 个字的名称。');
 if(!ICONS.includes(icon))throw Error('请选择一个图标。');
 if(type==='rewards'&&(!Number.isSafeInteger(threshold)||threshold<1||threshold>99999))throw Error('请填写 1 到 99999 的整数星星数。');
 if(type==='rewards'&&s.claims.some(c=>c.rewardId===id))throw Error('已领取的奖励不能修改，请添加新奖励。');
 if(type==='tasks'&&s.tasks.some(t=>t.active&&t.id!==id&&t.name===name))throw Error('已经有同名任务啦。');
 const old=s[type].find(t=>t.id===id);if(id&&!old)throw Error('记录不存在。');
 const item={id:old?.id||uid(),name,icon,active:old?.active??true,...(type==='rewards'?{threshold}:{})};
 if(old)Object.assign(old,item);else s[type].push(item);return item.id;
}
export function deleteItem(s,type,id){
 if(!['tasks','rewards'].includes(type))throw Error('类型无效。');
 const index=s[type].findIndex(x=>x.id===id);if(index===-1)throw Error('记录不存在。');
 const [item]=s[type].splice(index,1);
 if(type==='tasks'){const before=s.completions.length;s.completions=s.completions.filter(c=>c.taskId!==id);return{name:item.name,removedStars:before-s.completions.length};}
 s.claims=s.claims.filter(c=>c.rewardId!==id);return{name:item.name,removedStars:0};
}
