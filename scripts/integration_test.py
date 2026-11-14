"""Local integration smoke test. Requires compose services and API on localhost.
Creates temporary Keycloak users/client and a disposable family; cleans them up.
Uses password grant ONLY in its temporary test client, never in the mobile client.
"""
import json, os, re, secrets, subprocess, uuid
from urllib.request import Request, urlopen
from urllib.parse import urlencode
from urllib.error import HTTPError
KC='http://localhost:8080';API='http://localhost:5080';realm=KC+'/realms/familytable'
admin=None;client_id=None;user_ids=[];family_id=None
count=0
def request(method,url,data=None,token=None,form=False):
 headers={}
 if token:headers['Authorization']='Bearer '+token
 if data is not None:headers['Content-Type']='application/x-www-form-urlencoded' if form else 'application/json'
 body=(urlencode(data) if form else json.dumps(data)).encode() if data is not None else None
 with urlopen(Request(url,body,headers,method=method),timeout=20) as r:
  raw=r.read();return json.loads(raw) if raw else None

def check(condition,message):
 global count
 assert condition,message
 count+=1;print('PASS:',message)
def expect_status(code,fn,message):
 try:fn();raise AssertionError('Expected status '+str(code))
 except HTTPError as e:check(e.code==code,message)
def adminreq(method,path,data=None):return request(method,KC+'/admin/realms/familytable'+path,data,admin)
def api(method,path,data=None,token=None):return request(method,API+'/api'+path,data,token)
try:
 admin=request('POST',KC+'/realms/master/protocol/openid-connect/token',{'client_id':'admin-cli','grant_type':'password','username':'admin','password':os.getenv('KEYCLOAK_ADMIN_PASSWORD','local-admin-only')},form=True)['access_token']
 name='integration-'+uuid.uuid4().hex
 adminreq('POST','/clients',{'clientId':name,'enabled':True,'publicClient':True,'directAccessGrantsEnabled':True,'standardFlowEnabled':False,'protocolMappers':[{'name':'api-audience','protocol':'openid-connect','protocolMapper':'oidc-audience-mapper','config':{'included.custom.audience':'familytable-api','access.token.claim':'true'}}]})
 client_id=adminreq('GET','/clients?clientId='+name)[0]['id']
 def user(label):
  username=name+'-'+label;email=username+'@example.test';password=secrets.token_urlsafe(24)
  adminreq('POST','/users',{'username':username,'firstName':label,'lastName':'Test','email':email,'enabled':True,'emailVerified':True,'credentials':[{'type':'password','value':password,'temporary':False}]})
  uid=adminreq('GET','/users?username='+username)[0]['id'];user_ids.append(uid)
  token=request('POST',realm+'/protocol/openid-connect/token',{'client_id':name,'grant_type':'password','username':username,'password':password},form=True)['access_token'];return uid,token,email
 owner,ot,_=user('owner');member,mt,_=user('member');guest,gt,email=user('guest')
 f=api('POST','/families',{'name':'Disposable integration family'},ot);family_id=f['id'];base='/families/'+family_id
 check(len(f['ingredients'])>=7793,'USDA catalog is prefilled')
 check(any(x['id']==family_id for x in api('GET','/families',token=ot)),'EF family query returns only joined families')
 expect_status(403,lambda:api('GET',base,token=mt),'outsider cannot read family')
 api('POST','/join',{'code':f['joinCode']},mt);f=api('GET',base,token=ot)
 check(member not in [p['userId'] for p in f['people']],'code join waits for owner approval')
 approval=next(a for a in f['approvals'] if a['userId']==member)
 f=api('POST',base+'/approvals/'+approval['id'],{'revision':f['revision'],'approve':True},ot)
 mf=api('GET',base,token=mt);check(mf['joinCode'] is None,'member cannot see family join code')
 change={'kind':'ingredient','action':'upsert','id':None,'data':{'name':'Integration beans','category':'Pantry','archived':False}}
 before=len(f['ingredients']);mf=api('POST',base+'/changes',{'revision':f['revision'],'change':change},mt)
 check(len(mf['ingredients'])==before,'member change does not modify live ingredients')
 a=next(a for a in mf['approvals'] if a['status']=='Pending')
 expect_status(403,lambda:api('POST',base+'/approvals/'+a['id'],{'revision':mf['revision'],'approve':True},mt),'member cannot approve their own change')
 f=api('POST',base+'/approvals/'+a['id'],{'revision':mf['revision'],'approve':True},ot)
 check(len(f['ingredients'])==before+1,'owner approval persists the requested ingredient')
 expect_status(409,lambda:api('POST',base+'/changes',{'revision':1,'change':change},ot),'stale write is rejected by API')
 ingredient=f['ingredients'][-1]
 def save(kind,data,ident=None,action='upsert'):
  global f
  f=api('POST',base+'/changes',{'revision':f['revision'],'change':{'kind':kind,'action':action,'id':ident,'data':data}},ot)
 save('recipe',{'name':'Test bean bowl','description':'Test','minutes':10,'servings':2,'ingredients':[{'ingredientId':ingredient['id'],'quantity':1,'unit':'cup'}],'instructions':['Cook beans.'],'ratings':{},'archived':False})
 recipe=f['recipes'][-1];check(recipe['instructions']==['Cook beans.'],'recipe steps persist')
 save('recipe',{'rating':5},recipe['id'],'rate');check(f['recipes'][-1]['ratings'][owner]==5,'recipe rating persists per person')
 save('plan',{'name':'Test plan','meals':[{'id':str(uuid.uuid4()),'date':'2026-10-08','slot':'Dinner','recipeId':recipe['id'],'servings':4}],'archived':False})
 plan=f['mealPlans'][-1];needed=api('GET',base+'/plans/'+plan['id']+'/needed',token=ot)
 check(needed[0]['quantity']==2,'needed ingredients scale from 2 to 4 servings')
 save('grocery',{'name':'Test groceries','items':[dict(needed[0],id=str(uuid.uuid4()),checked=False)],'archived':False});grocery=f['groceryLists'][-1]
 save('grocery',{'itemId':grocery['items'][0]['id'],'checked':True},grocery['id'],'check');check(f['groceryLists'][-1]['items'][0]['checked'],'grocery check persists')
 save('recipe',{},recipe['id'],'archive');check(f['recipes'][-1]['archived'],'archiving retains recipe')
 save('recipe',{},recipe['id'],'restore');check(not f['recipes'][-1]['archived'],'restore returns recipe')
 api('POST',base+'/invites',{'email':email},ot)
 inbox=request('GET','http://localhost:8025/api/v1/messages')
 latest=next(m for m in inbox['messages'] if any(t['Address']==email for t in m['To']))
 message=request('GET','http://localhost:8025/api/v1/message/'+latest['ID'])
 invite=re.search(r'[0-9a-f-]{36}:[A-F0-9]{32}',message['Text']).group(0)
 joined=api('POST','/accept-invite',{'token':invite},gt);check(any(p['userId']==guest for p in joined['people']),'verified-email invite acceptance joins family')
 expect_status(400,lambda:api('POST','/accept-invite',{'token':invite},gt),'invite token is single-use')
 promoted=api('POST',base+'/members/'+member+'/role',{'role':'Owner'},ot);check(next(p for p in promoted['people'] if p['userId']==member)['role']=='Owner','second family owner can be assigned')
 print(f'Integration checks passed: {count}')
finally:
 if family_id:
  # The UUID is generated by our API and explicitly validated before disposable-data cleanup.
  ident=str(uuid.UUID(family_id))
  subprocess.run(['docker','compose','exec','-T','postgres','psql','-U','familytable','-d','familytable','-c',f'''DELETE FROM "Families" WHERE "Id" = '{ident}';'''],check=True,stdout=subprocess.DEVNULL)
 if admin:
  for uid in user_ids:adminreq('DELETE','/users/'+uid)
  if client_id:adminreq('DELETE','/clients/'+client_id)
