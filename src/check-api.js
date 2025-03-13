import fetch from 'node-fetch';
import fs from 'fs';

// API 端点
const API_ENDPOINT = 'https://dlmm-api.meteora.ag/pair/all';

async function checkAPI() {
  try {
    console.log(`正在从 ${API_ENDPOINT} 获取数据...`);
    const response = await fetch(API_ENDPOINT);
    
    if (!response.ok) {
      console.error(`请求失败，状态码: ${response.status}`);
      return;
    }
    
    const data = await response.json();
    
    // 检查数据类型
    console.log('数据类型:', typeof data);
    console.log('是否为数组:', Array.isArray(data));
    
    if (Array.isArray(data)) {
      console.log('数组长度:', data.length);
      
      if (data.length > 0) {
        // 检查第一个元素的结构
        console.log('\n第一个元素的结构:');
        const firstItem = data[0];
        console.log(JSON.stringify(firstItem, null, 2));
        
        // 检查是否有 tokenXSymbol 和 tokenYSymbol
        const itemsWithSymbols = data.filter(item => item.tokenXSymbol && item.tokenYSymbol);
        console.log(`\n有代币符号的元素数量: ${itemsWithSymbols.length}`);
        
        if (itemsWithSymbols.length > 0) {
          console.log('\n有代币符号的第一个元素:');
          console.log(JSON.stringify(itemsWithSymbols[0], null, 2));
        }
        
        // 检查是否有 volume24h 和 tvl
        const itemsWithVolumeAndTvl = data.filter(item => item.volume24h && item.tvl);
        console.log(`\n有交易量和 TVL 的元素数量: ${itemsWithVolumeAndTvl.length}`);
        
        if (itemsWithVolumeAndTvl.length > 0) {
          console.log('\n有交易量和 TVL 的第一个元素:');
          console.log(JSON.stringify(itemsWithVolumeAndTvl[0], null, 2));
        }
        
        // 保存一些样本数据到文件
        const sampleData = data.slice(0, 10);
        fs.writeFileSync('api-sample.json', JSON.stringify(sampleData, null, 2));
        console.log('\n已将 10 个样本数据保存到 api-sample.json');
      }
    } else if (typeof data === 'object') {
      console.log('对象结构:', Object.keys(data));
      
      if (data.data && Array.isArray(data.data)) {
        console.log('data 数组长度:', data.data.length);
        
        if (data.data.length > 0) {
          console.log('\n第一个元素的结构:');
          console.log(JSON.stringify(data.data[0], null, 2));
        }
      }
    }
  } catch (error) {
    console.error('检查 API 时出错:', error);
  }
}

checkAPI().catch(console.error); 