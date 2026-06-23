// 尝试通过 REST API 直接调用 Stitch
// @author Jason

const key = 'AQ.Ab8RN6Io8QhdZQy5ROaOoXkSLyXPWwnSEqbTNX82uSg_I7wdZQ';

async function tryStitch() {
  // 尝试 REST API 端点
  const baseUrl = 'https://stitch.googleapis.com/v1';
  const headers = {
    'X-Goog-Api-Key': key,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };

  console.log('尝试连接 Stitch REST API...\n');

  // 创建项目
  try {
    const resp = await fetch(`${baseUrl}/projects`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ title: 'JMComic iOS' }),
      signal: AbortSignal.timeout(15000),
    });
    console.log('状态:', resp.status);
    const text = await resp.text();
    console.log('响应:', text.slice(0, 500));
  } catch (err) {
    console.error('REST 失败:', err.message);
  }

  // 如果 REST 不行，试 MCP SSE 端点
  console.log('\n尝试 MCP 端点...');
  try {
    const resp = await fetch('https://stitch.googleapis.com/mcp', {
      method: 'POST',
      headers: {
        'X-Goog-Api-Key': key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: 1,
        method: 'tools/list',
        params: {},
      }),
      signal: AbortSignal.timeout(15000),
    });
    console.log('MCP 状态:', resp.status);
    const text = await resp.text();
    console.log('MCP 响应:', text.slice(0, 500));
  } catch (err) {
    console.error('MCP 失败:', err.message);
  }
}

tryStitch().catch(console.error);
