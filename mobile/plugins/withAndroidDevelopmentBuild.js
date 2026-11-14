const {withAppBuildGradle,withGradleProperties}=require('expo/config-plugins');
module.exports=function withAndroidDevelopmentBuild(config){
 config=withAppBuildGradle(config,c=>{
  const marker='abiFilters.addAll';
  if(!c.modResults.contents.includes(marker))c.modResults.contents=c.modResults.contents.replace('defaultConfig {','defaultConfig {\n        ndk { abiFilters.addAll((findProperty("reactNativeArchitectures") ?: "arm64-v8a").split(",")) }');
  if(!c.modResults.contents.includes("        preview {"))c.modResults.contents=c.modResults.contents.replace("    buildTypes {","    buildTypes {\n        preview {\n            initWith release\n            matchingFallbacks = ['release']\n            signingConfig signingConfigs.debug\n            versionNameSuffix \"-preview\"\n        }\n");
  return c;
 });
 return withGradleProperties(config,c=>{
  const arch=c.modResults.find(p=>p.type==='property'&&p.key==='reactNativeArchitectures');
  if(arch)arch.value='arm64-v8a';
  else c.modResults.push({type:'property',key:'reactNativeArchitectures',value:'arm64-v8a'});
  return c;
 });
};
