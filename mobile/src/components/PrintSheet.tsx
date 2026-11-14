import {useState} from 'react';
import {View} from 'react-native';
import {Text} from './Typography';
import {Printer,Trash2} from 'lucide-react-native';
import {useApp} from '../lib/context';
import {printSheets} from '../lib/print';
import {Sheet,Chip,Button,ui} from './ui';
import {Picker} from './Editor';

export type PrintDraft={list:string;plan:string;sections:string[];separate:boolean};

export default function PrintSheet({draft,onClose}:{draft?:PrintDraft;onClose:(draft:PrintDraft)=>void}){
 const a=useApp(),f=a.family;
 const [settings,setSettings]=useState<PrintDraft>(()=>draft??{
  list:f.groceryLists.find(l=>!l.archived)?.id??'',
  plan:f.mealPlans.find(p=>!p.archived)?.id??'',
  sections:['groceries','ingredients','plan'],
  separate:false,
 });
 const [busy,setBusy]=useState(false);
 const {list,plan,sections,separate}=settings;
 const validList=f.groceryLists.some(l=>l.id===list&&!l.archived);
 const validPlan=f.mealPlans.some(p=>p.id===plan&&!p.archived);
 return <Sheet open title="Print or save PDF" onClose={()=>{if(!busy)onClose(settings)}}>
  <View style={{gap:18}}>
   <Text style={ui.subtitle}>Select a grocery list, meal plan, and sections to print or save as a PDF.</Text>
   <Picker label="Grocery list" value={list} options={f.groceryLists.filter(l=>!l.archived).map(l=>({value:l.id,label:l.name}))} onChange={list=>setSettings(current=>({...current,list}))}/>
   <Picker label="Meal plan" value={plan} options={f.mealPlans.filter(p=>!p.archived).map(p=>({value:p.id,label:p.name}))} onChange={plan=>setSettings(current=>({...current,plan}))}/>
   <View style={{flexDirection:'row',gap:8,flexWrap:'wrap'}}>
    {[{key:'groceries',label:'Grocery list'},{key:'ingredients',label:'Needed ingredients'},{key:'plan',label:'Meal plan'}].map(s=><Chip key={s.key} label={s.label} active={sections.includes(s.key)} onPress={()=>setSettings(current=>({...current,sections:current.sections.includes(s.key)?current.sections.filter(k=>k!==s.key):[...current.sections,s.key]}))}/>)}
   </View>
   <View style={{flexDirection:'row',gap:8}}>
    <Chip label="Combined sheet" active={!separate} onPress={()=>setSettings(current=>({...current,separate:false}))}/>
    <Chip label="Separate sheets" active={separate} onPress={()=>setSettings(current=>({...current,separate:true}))}/>
   </View>
   <Button title="Print or save PDF" icon={Printer} disabled={busy||!sections.length||(sections.includes('groceries')&&!validList)||((sections.includes('ingredients')||sections.includes('plan'))&&!validPlan)} onPress={async()=>{
    setBusy(true);
    try{await printSheets(f,list,plan,sections,separate);onClose(settings)}
    catch(e){a.notify((e as Error).message)}
    finally{setBusy(false)}
   }}/>
   <Button secondary title="Clear" icon={Trash2} disabled={busy} onPress={()=>setSettings({list:'',plan:'',sections:[],separate:false})}/>
  </View>
 </Sheet>;
}
