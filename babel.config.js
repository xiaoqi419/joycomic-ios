module.exports = function (api) {
  api.cache(true);
  return {
    presets: [['babel-preset-expo', { jsxRuntime: 'automatic' }]],
    plugins: [
      // 生产环境移除 console.log
      ...(process.env.NODE_ENV === 'production'
        ? ['transform-remove-console']
        : []),
    ],
  };
};
