import {createContext,useContext} from 'react';
import {Family,Change,Kind} from './types';
export type AppContextType={family:Family;user:string;demo:boolean;busy:boolean;save:(c:Change)=>Promise<void>;decide:(id:string,approve:boolean)=>Promise<void>;edit:(kind:Kind,id?:string,data?:any,source?:string)=>void;viewRecipe:(id:string)=>void;notify:(s:string)=>void;print:()=>void;tab:(s:string)=>void;refresh:()=>Promise<void>;switchUser:(id:string)=>void;invite:(email:string)=>Promise<void>;join:(code:string,invitation?:boolean)=>Promise<void>;promote:(user:string,role:'Owner'|'Member')=>Promise<void>;rotate:()=>Promise<void>};
export const AppContext=createContext<AppContextType>(null!);
export const useApp=()=>useContext(AppContext);
