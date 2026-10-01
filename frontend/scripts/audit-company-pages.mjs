import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
const base = process.env.COMPANY_AUDIT_URL || 'http://127.0.0.1:3280';
const out = process.env.COMPANY_AUDIT_OUTPUT || '../artifacts/company-pages';
await mkdir(out, {recursive:true});
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless:true });
const result = [];
for (const [label,width,height] of [['desktop',1440,1000],['tablet',768,1024],['mobile',390,844],['narrow',320,780]]) {
  const page = await browser.newPage({viewport:{width,height},deviceScaleFactor:1});
  for (const [name,path] of [['home','/'],['company','/company'],['geography','/manufacturers'],['contacts','/contacts']]) {
    const errors = []; const listener = error => errors.push(error.message); page.on('pageerror',listener);
    await page.goto(base+path,{waitUntil:'networkidle'});
    const audit = await page.evaluate(() => ({width:window.innerWidth,documentWidth:document.documentElement.scrollWidth,images:[...document.querySelectorAll('main img')].every(img=>img.complete&&img.naturalWidth>0),h1:document.querySelector('h1')?.textContent}));
    await page.screenshot({path:`${out}/${name}-${label}.png`,fullPage:true});
    result.push({page:name,viewport:label,...audit,errors}); page.off('pageerror',listener);
  }
  await page.close();
}
await browser.close(); await writeFile(`${out}/visual-audit.json`,JSON.stringify(result,null,2));
console.log(JSON.stringify(result,null,2));
if(result.some(item=>item.documentWidth>item.width || !item.images || item.errors.length))process.exitCode=1;
