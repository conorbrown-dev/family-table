const config=require('../mobile/tailwind.config');
module.exports={...config,content:[require('path').join(__dirname,'../mobile/App.tsx'),require('path').join(__dirname,'../mobile/src/**/*.{ts,tsx}'),require('path').join(__dirname,'src/**/*.{ts,tsx}')]};
