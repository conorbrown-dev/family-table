import {Change,Family,Portion,collections} from './types';
export function needed(f:Family,planId:string):Portion[] {
 const totals=new Map<string,Portion>();
 for(const meal of f.mealPlans.find(p=>p.id===planId)?.meals??[]) {
  const recipe=f.recipes.find(r=>r.id===meal.recipeId);if(!recipe)continue;
  for(const portion of recipe.ingredients){const key=portion.ingredientId+'|'+portion.unit;const quantity=portion.quantity*meal.servings/recipe.servings;const prev=totals.get(key);totals.set(key,{...portion,quantity:quantity+(prev?.quantity??0)});}
 } return [...totals.values()];
}
export const uuid=()=> 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g,c=>{const r=Math.random()*16|0;return(c==='x'?r:(r&3|8)).toString(16);});
export function fingerprint(f:Family,c:Change) {if(c.kind==='membership'||!c.id)return '';return JSON.stringify((f[collections[c.kind]] as {id:string}[]).find(x=>x.id===c.id));}
export function applyChange(f:Family,c:Change,user:string):Family {
 const next=JSON.parse(JSON.stringify(f)) as Family;
 if(c.kind==='membership')return next;
 if(c.action==='rate'){const r=next.recipes.find(r=>r.id===c.id);if(r)r.ratings[user]=c.data.rating;return next;}
 if(c.action==='check'){const i=next.groceryLists.find(l=>l.id===c.id)?.items.find(i=>i.id===c.data.itemId);if(i)i.checked=c.data.checked;return next;}
 const items=next[collections[c.kind]] as any[];const index=items.findIndex(i=>i.id===c.id);
 if(c.action==='archive'||c.action==='restore'){if(index>=0)items[index].archived=c.action==='archive';}
 else if(c.action==='upsert'){const item={...c.data,id:c.id??uuid(),archived:c.data.archived??false};if(c.kind==='recipe')item.ratings=index>=0?items[index].ratings:{};if(index>=0)items[index]=item;else items.push(item);}
 return next;
}
export function submitDemo(f:Family,c:Change,user:string):Family {
 const member=f.people.find(p=>p.userId===user);if(!member)throw new Error('Join this family first.');
 const next=member.role==='Owner'?applyChange(f,c,user):{...f,approvals:[...f.approvals,{id:uuid(),userId:user,name:member.name,change:c,baseRevision:f.revision,status:'Pending',fingerprint:fingerprint(f,c)}]};return {...next,revision:f.revision+1};
}
export function decideDemo(f:Family,approvalId:string,approve:boolean,user:string):Family {
 if(f.people.find(p=>p.userId===user)?.role!=='Owner')throw new Error('An owner needs to approve this.');
 const a=f.approvals.find(a=>a.id===approvalId);if(!a||a.status!=='Pending')throw new Error('Request already reviewed.');
 if(approve&&a.fingerprint!==fingerprint(f,a.change))throw new Error('This item changed. Please ask for a fresh request.');
 const next=approve?applyChange(f,a.change,a.userId):{...f};return {...next,revision:f.revision+1,approvals:next.approvals.map(x=>x.id===a.id?{...x,status:approve?'Approved':'Declined'}:x)};
}
export const escapeHtml=(s:string)=>s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export function printHtml(f:Family,listId:string|undefined,planId:string|undefined,sections:string[],separate:boolean) {
 const ingredient=(id:string)=>escapeHtml(f.ingredients.find(i=>i.id===id)?.name??'Ingredient');
 const amount=(p:Portion)=>`${Number(p.quantity.toFixed(2))} ${escapeHtml(p.unit)}`;
 const list=f.groceryLists.find(l=>l.id===listId),plan=f.mealPlans.find(p=>p.id===planId);
 const blocks:string[]=[];
 if(sections.includes('groceries')&&list)blocks.push(`<section><h2>${escapeHtml(list.name)}</h2>${list.items.map(i=>`<p>${i.checked?'☑':'☐'} ${ingredient(i.ingredientId)} <span>${amount(i)}</span></p>`).join('')}</section>`);
 if(sections.includes('ingredients')&&plan)blocks.push(`<section><h2>Ingredients for ${escapeHtml(plan.name)}</h2>${needed(f,plan.id).map(i=>`<p>☐ ${ingredient(i.ingredientId)} <span>${amount(i)}</span></p>`).join('')}</section>`);
 if(sections.includes('plan')&&plan)blocks.push(`<section><h2>${escapeHtml(plan.name)}</h2>${[...plan.meals].sort((a,b)=>a.date.localeCompare(b.date)).map(m=>`<p><b>${escapeHtml(m.date)} · ${escapeHtml(m.slot)}</b><br>${escapeHtml(f.recipes.find(r=>r.id===m.recipeId)?.name??'Recipe')} <span>${m.servings} servings</span></p>`).join('')}</section>`);
 return `<!doctype html><html><head><meta charset="utf-8"><style>@page{size:letter;margin:0.55in}body{font:12px Arial;color:#234b3e}h1{font-size:28px}h2{font-size:17px;border-bottom:1px solid #ddd;padding-bottom:10px}section{${separate?'break-after:page;':''}}section:last-child{break-after:auto}p{padding:7px 0;border-bottom:1px solid #eee;break-inside:avoid}span{float:right;color:#555}header{margin-bottom:22px}small{color:#555}</style></head><body><header><h1>Family Table</h1><small>${escapeHtml(f.name)} · A little planning, a lot of togetherness.</small></header>${blocks.join('')}</body></html>`;
}
