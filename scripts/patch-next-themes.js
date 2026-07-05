const { readFileSync, writeFileSync } = require("node:fs");
const { join } = require("node:path");

const patches = [
  {
    file: "node_modules/next-themes/dist/index.mjs",
    search:
      '=t.memo(({forcedTheme:e,storageKey:i,attribute:s,enableSystem:u,enableColorScheme:m,defaultTheme:a,value:l,themes:h,nonce:d,scriptProps:w})=>{let p=JSON.stringify([s,i,a,e,h,l,u,m]).slice(1,-1);return t.createElement("script",{...w,suppressHydrationWarning:!0,nonce:typeof window=="undefined"?d:"",dangerouslySetInnerHTML:{__html:`(${M.toString()})(${p})`}})}),',
    replace: "=t.memo(()=>null),",
  },
  {
    file: "node_modules/next-themes/dist/index.js",
    search:
      'Y=t.memo(({forcedTheme:e,storageKey:s,attribute:n,enableSystem:l,enableColorScheme:o,defaultTheme:d,value:u,themes:h,nonce:m,scriptProps:w})=>{let p=JSON.stringify([n,s,d,e,h,u,l,o]).slice(1,-1);return t.createElement("script",{...w,suppressHydrationWarning:!0,nonce:typeof window=="undefined"?m:"",dangerouslySetInnerHTML:{__html:`(${I.toString()})(${p})`}})}),',
    replace: "Y=t.memo(()=>null),",
  },
];

for (const { file, search, replace } of patches) {
  const filePath = join(process.cwd(), file);
  const source = readFileSync(filePath, "utf8");

  if (source.includes(replace)) {
    continue;
  }

  if (!source.includes(search)) {
    throw new Error(`Could not patch next-themes script injection in ${file}`);
  }

  writeFileSync(filePath, source.replace(search, replace));
}
