import {Platform} from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import {Family} from './types';
import {printHtml} from './operations';
export async function printSheets(f:Family,list:string|undefined,plan:string|undefined,sections:string[],separate:boolean) {
 const html=printHtml(f,list,plan,sections,separate);
 if(Platform.OS==='web') {await Print.printAsync({html});return;}
 const result=await Print.printToFileAsync({html});
 if(await Sharing.isAvailableAsync())await Sharing.shareAsync(result.uri,{mimeType:'application/pdf',UTI:'.pdf'});
 else await Print.printAsync({uri:result.uri});
}
