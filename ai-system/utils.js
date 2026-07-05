/**
 * V7.1 Utils - 基础工具函数
 */

module.exports = {
  log: (msg) => console.log(`🔧 ${new Date().toISOString()} ${msg}`),
  
  error: (msg) => console.error(`❌ ${new Date().toISOString()} ${msg}`),
  
  success: (msg) => console.log(`✅ ${new Date().toISOString()} ${msg}`),
  
  info: (msg) => console.log(`ℹ️  ${new Date().toISOString()} ${msg}`)
};
