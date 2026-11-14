const path=require('path');
const {getDefaultConfig}=require('expo/metro-config');
const {withNativeWind}=require('nativewind/metro');
const config=getDefaultConfig(__dirname);
const mobile=path.resolve(__dirname,'../mobile');
config.watchFolders=[mobile];
config.resolver.nodeModulesPaths=[path.join(__dirname,'node_modules')];
config.resolver.disableHierarchicalLookup=true;
// Reuse app screens; swap only browser authentication and the web stylesheet.
config.resolver.resolveRequest=(context,name,platform)=>{
 const target=path.resolve(path.dirname(context.originModulePath),name);
 if(platform==='web'&&target===path.join(mobile,'src/lib/auth'))return {type:'sourceFile',filePath:path.join(__dirname,'src/auth.ts')};
 if(platform==='web'&&target===path.join(mobile,'global.css'))return {type:'sourceFile',filePath:path.join(__dirname,'global.css')};
 return context.resolveRequest(context,name,platform);
};
module.exports=withNativeWind(config,{input:path.join(__dirname,'global.css'),configPath:path.join(__dirname,'tailwind.config.js')});
