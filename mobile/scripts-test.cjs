const ts=require('typescript');
const fs=require('fs');
const path=require('path');
// React Native cannot render raw text (including single-line spaces) under a View.
for (const file of ['App.tsx', ...['src/components','src/screens'].flatMap(folder => fs.readdirSync(path.join(__dirname, folder)).filter(name => name.endsWith('.tsx')).map(name => folder+'/'+name))]) {
 const ast=ts.createSourceFile(file,fs.readFileSync(path.join(__dirname,file),'utf8'),ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
 function inspect(node) {
  if(ts.isJsxText(node) && node.text.length && !node.text.includes('\n') && ts.isJsxElement(node.parent) && node.parent.openingElement.tagName.getText(ast)!=='Text') {
   throw new Error(`${file}: raw text outside a Text component: ${JSON.stringify(node.text)}`);
  }
  ts.forEachChild(node,inspect);
 }
 inspect(ast);
}
console.log('Native JSX text regression check passed');
const dir=path.join(require('os').tmpdir(),'familytable-tests');
fs.mkdirSync(dir,{recursive:true});
for(const name of ['types','demo','operations','operations.test']) {
 const source=fs.readFileSync(path.join(__dirname,'src/lib',name+'.ts'),'utf8');
 const compiled=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}});
 fs.writeFileSync(path.join(dir,name+'.js'),compiled.outputText);
}
const result=require('child_process').spawnSync(process.execPath,['--test',path.join(dir,'operations.test.js')],{stdio:'inherit'});
process.exit(result.status??1);
