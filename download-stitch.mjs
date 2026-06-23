// 下载 Stitch v2 生成的设计截图 + 提取 HTML 转换原生组件
// @author Jason

import { setGlobalDispatcher, ProxyAgent } from 'undici';
import fs from 'fs';
import path from 'path';

const PROXY_URL = 'http://127.0.0.1:7897';
const OUTPUT = 'stitch-output-v2';
const PROJECT_ID = '11211691890618387059';

if (PROXY_URL) setGlobalDispatcher(new ProxyAgent(PROXY_URL));

const pages = [
  {
    name: '01-首页',
    htmlUrl: 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzA3MTA5NzBhMTMzNzQ2N2JhODJhNTg0NzZmZGYzOGI3EgsSBxDS4uzexRsYAZIBJAoKcHJvamVjdF9pZBIWQhQxMTIxMTY5MTg5MDYxODM4NzA1OQ&filename=&opi=96797242',
    imgUrl: 'https://lh3.googleusercontent.com/aida/AP1WRLvHbgzjaGq4jvATpbCZjv7WDT145KlXu8Qx21F2-jrce1xSImh3wyQHTNfGh-UZv1SQN0b7yPffTsQp83kBf3EaIAJCBh1zET8iN0P9ymVBd-sexFIiCt88G_DCuSNdiHz1VDHvjgjYxp_m3CBzYjaFJnkEmlbY5zpQ-2ARcFnJCsMYVHpQjdsaBGM_jlf6bmdtpy5lJY2tiCBekw-sa2eETksvJnECK6DR4RDDjHCyXgxe7cAQe8lp7sD_',
  },
  {
    name: '02-搜索页',
    htmlUrl: 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzEzMjg1NTJjMjkwODRiNzViZTE4YzAwZDVjMTEyZDU4EgsSBxDS4uzexRsYAZIBJAoKcHJvamVjdF9pZBIWQhQxMTIxMTY5MTg5MDYxODM4NzA1OQ&filename=&opi=96797242',
    imgUrl: 'https://lh3.googleusercontent.com/aida/AP1WRLvB0KLqZOEKN6_1_uSSr5n2vDCt8HGthURs_HgzGNev_8PMt9mAT5C2ivn2WAOqaQjmxrLfprCN53VjmtPnSmERJGj2kEm5U6CjUL8EZAy1W06w1COApXzXFXpsdFUnSycbXE8kmA4b180HqW8gx9WGpVS2i8M0noEgmAgFA50uZjP2U-Jl3ykobZnbhUGu6hShiSQgvHjfZE9m2uAfYehe317dlr8-rkjwxzVCIgzfhsa0Oai8XqIh2qX1',
  },
  {
    name: '03-漫画详情',
    htmlUrl: 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzk1MWZjYjdiYmZkZDQ5YjM4OTMzNDNiNWYyZTEzNTM3EgsSBxDS4uzexRsYAZIBJAoKcHJvamVjdF9pZBIWQhQxMTIxMTY5MTg5MDYxODM4NzA1OQ&filename=&opi=96797242',
    imgUrl: 'https://lh3.googleusercontent.com/aida/AP1WRLvsM6TW_Qrbef1y5Rd00ePE1oizw3Eh1tt14qq1KeVnnQjMEVQuOHnP-y7Jve4TmeASQ8gsstC8QUVuLNXe6TDxi93HbgEDbtRAhSWqHE8e37Vf4Z-uOi069ltxmXK5U6HUVlCNilUPgc54dgoCavXYhtrjGakSSQAQlHlVKyLCqrB7fbKFdGPf0O3rM-jqhD3UKPRwALuiojXN7G2sOXoyPle98MNSTSGIdh3PZzi4h_dew_nHwXjwVig',
  },
  {
    name: '04-阅读器',
    htmlUrl: 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sX2M5OTk1YjY4OWMzYzQyOTM5ZmY2YzQyZjYxNTRkNDExEgsSBxDS4uzexRsYAZIBJAoKcHJvamVjdF9pZBIWQhQxMTIxMTY5MTg5MDYxODM4NzA1OQ&filename=&opi=96797242',
    imgUrl: 'https://lh3.googleusercontent.com/aida/AP1WRLuyRgqY629e93yhUm0_kG3vG84O3Tg0Jwi2Y4UdwEyt-PNE_AqxUK_MmPrG3eU4I6t1DpXlhAe77PH2mY9J04TwYSFgxciIFzwWd5-OT5UrnpeDJ9ZYbQqk_cC31E40rJ-_cM3S4OhEQaXTIvHCEE_Xzas0ZBiaVDHjrW8aEhW6a6sbKJAgp2wy1rwSy99osWpxdBnnmpyEc1oeHRqd-p0vKfM5VTh9g1Aw9AFOo27u-O__0ldHGk3aZx0n',
  },
  {
    name: '05-收藏页',
    htmlUrl: 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sX2FkZGQyM2Y5NjY4NjQ4Mzg4MmRmOGRiY2Q4MjA2YzQxEgsSBxDS4uzexRsYAZIBJAoKcHJvamVjdF9pZBIWQhQxMTIxMTY5MTg5MDYxODM4NzA1OQ&filename=&opi=96797242',
    imgUrl: 'https://lh3.googleusercontent.com/aida/AP1WRLvxagA1u4poLnGwr5SVSIDKrBRY4ZUDvtYcABpAPlP-fDEM-TCL3G-YxvDB6o6RzE_-v6skYg_8XG49irSTUYyJE1aS4YvKG5QMnMRkrLaTdd7sgbxl5wEzAKQT8y_qKDVGVnyddDMAejRqNwgDoiv05FIcvM7OxzkbCtAntR4JJ1NN6alDM0PwlA8cbJ2eBZ718RvLFHjJWubOsOdzyrQAUQjkW40YrbCtOSDratuLpHiDoTkOCXRmlCY',
  },
  {
    name: '06-设置页',
    htmlUrl: 'https://contribution.usercontent.google.com/download?c=CgthaWRhX2NvZGVmeBJ8Eh1hcHBfY29tcGFuaW9uX2dlbmVyYXRlZF9maWxlcxpbCiVodG1sXzQ2ZGI2YTc0MWUzNjRmOGI5ZmFjNjAwZGJlOWI1MGNkEgsSBxDS4uzexRsYAZIBJAoKcHJvamVjdF9pZBIWQhQMTIxMTY5MTg5MDYxODM4NzA1OQ&filename=&opi=96797242',
    imgUrl: 'https://lh3.googleusercontent.com/aida/AP1WRLteaTvs78Nmy8X60KrGpEDpZVjNACzUs43vqJXFRFhIp3BzDgg0V8H2RvcNuZ4YkZugEEgKEKN6r-80azjUk0TXtEVKxt0HYxEYhXM5GmHEROAodVIZ-il5nrDJW2V0SGWFT0xS1UEGt-yFpxWxmd4_rNmRwACTnKdjlk9lcvBBSOyG0m4u15vZgTa8X3azekyoJHY1Uq5m41QvqFdY11BXazyo6NBiyANLFE0KvBFij029P182VCHw53o',
  },
];

async function download(url, filepath) {
  try {
    const resp = await fetch(url, { signal: AbortSignal.timeout(30000) });
    if (resp.ok) {
      const buffer = Buffer.from(await resp.arrayBuffer());
      fs.writeFileSync(filepath, buffer);
      console.log(`  ✅ ${path.basename(filepath)} (${(buffer.length / 1024).toFixed(0)}KB)`);
      return true;
    }
    console.log(`  ⚠️  ${path.basename(filepath)} HTTP ${resp.status}`);
    return false;
  } catch (err) {
    console.log(`  ❌ ${path.basename(filepath)} ${err.message}`);
    return false;
  }
}

async function main() {
  fs.mkdirSync(OUTPUT, { recursive: true });
  console.log(`📥 下载 Stitch v2 设计到 ${OUTPUT}/\n`);

  for (const page of pages) {
    console.log(`📁 ${page.name}:`);
    await download(page.htmlUrl, path.join(OUTPUT, `${page.name}.html`));
    await download(page.imgUrl, path.join(OUTPUT, `${page.name}.png`));
    console.log('');
  }

  console.log('✅ 全部下载完成！');
}

main().catch(console.error);
