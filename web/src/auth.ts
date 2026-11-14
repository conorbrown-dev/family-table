import {useEffect,useRef,useState} from 'react';
import {User,UserManager,WebStorageStateStore} from 'oidc-client-ts';

let manager:UserManager|undefined;
let startup:Promise<User|null>|undefined;
function session(){
 if(!manager){
  manager=new UserManager({
   authority:process.env.EXPO_PUBLIC_AUTH_URL??'https://keycloak-development-eb7c.up.railway.app/realms/familytable',
   client_id:'familytable-web',
   redirect_uri:`${window.location.origin}/callback`,
   post_logout_redirect_uri:window.location.origin+'/',
   response_type:'code',scope:'openid profile email',
   userStore:new WebStorageStateStore({store:window.sessionStorage}),
   stateStore:new WebStorageStateStore({store:window.sessionStorage}),
   automaticSilentRenew:true,monitorSession:false,
  });
 }
 return manager;
}
function initialize(){
 if(!startup)startup=(async()=>{
  const m=session();
  if(window.location.pathname==='/callback'){
   try{return await m.signinRedirectCallback();}
   finally{window.history.replaceState({},'', '/');}
  }
  await m.clearStaleState();
  const user=await m.getUser();
  if(user?.expired){try{return await m.signinSilent();}catch{await m.removeUser();return null;}}
  return user;
 })();
 return startup;
}
export function useAuth(){
 const [tokens,setTokens]=useState<User|null>(null),[error,setError]=useState(''),[ready,setReady]=useState(false);
 const current=useRef<User|null>(null),refresh=useRef<Promise<User|null>|null>(null);
 current.current=tokens;
 useEffect(()=>{
  let mounted=true;
  const m=session();
  const loaded=(user:User)=>{current.current=user;if(mounted)setTokens(user)};
  const unloaded=()=>{current.current=null;if(mounted)setTokens(null)};
  const failed=()=>{if(mounted)setError('Your session expired. Please sign in again.');};
  m.events.addUserLoaded(loaded);m.events.addUserUnloaded(unloaded);m.events.addSilentRenewError(failed);
  initialize().then(user=>{if(mounted){current.current=user;setTokens(user)}}).catch(e=>{if(mounted)setError(e instanceof Error?e.message:'Sign-in could not be completed.')}).finally(()=>{if(mounted)setReady(true)});
  return ()=>{mounted=false;m.events.removeUserLoaded(loaded);m.events.removeUserUnloaded(unloaded);m.events.removeSilentRenewError(failed)};
 },[]);
 async function accessToken(){
  let user=current.current;
  if(user&&(user.expires_in??0)<30){
   if(!refresh.current)refresh.current=session().signinSilent().finally(()=>{refresh.current=null});
   try{user=await refresh.current;}catch{await session().removeUser();throw new Error('Please sign in again.');}
  }
  return user?.access_token??'';
 }
 return {tokens,error,ready,user:tokens?.profile.sub,accessToken,
  login:()=>{setError('');return session().signinRedirect().catch(e=>setError(e.message));},
  logout:async()=>{setError('');try{await session().signoutRedirect();}catch{await session().removeUser();window.location.assign('/');}},
 };
}
