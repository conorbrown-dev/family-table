import {View} from 'react-native';
import {Text} from './Typography';
import {useApp} from '../lib/context';
import {Approval} from '../lib/types';
import {ui} from './ui';
export default function RequestPreview({request}:{request:Approval}) {
 const f=useApp().family,c=request.change,d=c.data;
 const ingredient=(id:string)=>f.ingredients.find(i=>i.id===id)?.name??'Ingredient';
 const recipe=(id:string)=>f.recipes.find(r=>r.id===id)?.name??'Recipe';
 const row=(label:string,value:string)=><View key={label} style={{gap:5}}><Text style={ui.label}>{label}</Text><Text style={ui.body}>{value}</Text></View>;
 if(c.kind==='membership')return <Text style={ui.body}>{request.name} requested to join the family.</Text>;
 if(c.action==='rate')return row('RATING',`${recipe(c.id!)} · ${d.rating} stars`);
 if(c.action==='check'){const item=f.groceryLists.find(l=>l.id===c.id)?.items.find(i=>i.id===d.itemId);return row('GROCERY ITEM',`${item?ingredient(item.ingredientId):'An ingredient'} · ${d.checked?'Checked off':'Put back on the list'}`);}
 if(c.action==='archive'||c.action==='restore')return <Text style={ui.body}>{c.action==='archive'?'Archive':'Restore'} this {c.kind==='plan'?'meal plan':c.kind==='grocery'?'grocery list':c.kind}.</Text>;
 return <View style={{gap:18}}>{row('NAME',d.name??'')}{Boolean(d.category)&&row('AISLE',d.category)}{Boolean(d.description)&&row('DESCRIPTION',d.description)}{Boolean(d.minutes)&&row('TIME & SERVINGS',`${d.minutes} minutes · ${d.servings} servings`)}{(d.ingredients??d.items)?.length>0&&<View style={{gap:7}}><Text style={ui.label}>INGREDIENTS</Text>{(d.ingredients??d.items).map((p:any,n:number)=><Text key={n} style={ui.body}>{ingredient(p.ingredientId)} · {p.quantity} {p.unit}</Text>)}</View>}{d.instructions?.length>0&&<View style={{gap:7}}><Text style={ui.label}>INSTRUCTIONS</Text>{d.instructions.map((s:string,n:number)=><Text key={n} style={ui.body}>{n+1}. {s}</Text>)}</View>}{d.meals?.length>0&&<View style={{gap:7}}><Text style={ui.label}>MEALS</Text>{d.meals.map((m:any,n:number)=><Text key={n} style={ui.body}>{m.date} · {m.slot}\n{recipe(m.recipeId)} · {m.servings} servings</Text>)}</View>}</View>;
}
