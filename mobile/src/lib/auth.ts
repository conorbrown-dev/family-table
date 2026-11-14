import {useEffect,useState,useRef} from 'react';
import {Platform} from 'react-native';
import * as AuthSession from 'expo-auth-session';
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from 'expo-web-browser';
WebBrowser.maybeCompleteAuthSession();
export function useAuth(){
 const authority=process.env.EXPO_PUBLIC_AUTH_URL??'http://localhost:8080/realms/familytable';
 const enabled=process.env.EXPO_PUBLIC_DEMO==='false';
 const discovery=AuthSession.useAutoDiscovery(enabled?authority:null);
 const redirectUri=AuthSession.makeRedirectUri({scheme:'familytable',path:'callback'});
 const [request,response,promptAsync]=AuthSession.useAuthRequest({clientId:'familytable-mobile',scopes:['openid','profile','email'],redirectUri,usePKCE:true},discovery);
 const [tokens,setTokens]=useState<AuthSession.TokenResponse|null>(null),[error,setError]=useState('');
 const current=useRef(tokens);current.current=tokens;
 async function store(t:AuthSession.TokenResponse|null){setTokens(t);if(Platform.OS!=='web'){if(t)await SecureStore.setItemAsync('familytable-session',JSON.stringify(t.getRequestConfig()));else await SecureStore.deleteItemAsync('familytable-session');}}
 useEffect(()=>{if(enabled&&Platform.OS!=='web')SecureStore.getItemAsync('familytable-session').then(s=>{if(s)setTokens(new AuthSession.TokenResponse(JSON.parse(s)))}).catch(e=>setError(e.message));},[]);
 useEffect(()=>{if(response?.type==='success'&&discovery&&request?.codeVerifier)AuthSession.exchangeCodeAsync({clientId:'familytable-mobile',code:response.params.code,redirectUri,extraParams:{code_verifier:request.codeVerifier}},discovery).then(store).catch(e=>setError(e.message));else if(response?.type==='error')setError(response.error?.message??'Sign-in did not finish.');},[response]);
 async function accessToken(){let t=current.current;if(t&&discovery&&!AuthSession.TokenResponse.isTokenFresh(t)){if(!t.refreshToken){await store(null);throw new Error('Please sign in again.');}try{t=await AuthSession.refreshAsync({clientId:'familytable-mobile',refreshToken:t.refreshToken},discovery);await store(t)}catch(e){await store(null);throw e;}}return t?.accessToken??'';}
 const claims=(()=>{try{return JSON.parse(atob(tokens?.accessToken.split('.')[1].replace(/-/g,'+').replace(/_/g,'/')??''))}catch{return {}}})();
 return {tokens,error,user:claims.sub as string|undefined,ready:!!request,login:()=>promptAsync(),accessToken,logout:async()=>{const t=current.current;if(t?.refreshToken&&discovery)await AuthSession.revokeAsync({clientId:'familytable-mobile',token:t.refreshToken},discovery).catch(()=>{});await store(null)}};
}
