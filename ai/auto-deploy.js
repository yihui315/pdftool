#!/usr/bin/env node
/**
 * V6 Auto-Deploy - 自动部署脚本
 * 
 * Phase 3: commit → push → ssh deploy → nginx reload
 * 
 * 用法: node ai/auto-deploy.js
 */

import { execSync } from 'child_process';
import { existsSync, readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { scanHtmlFiles, getPageConfig, generateSitemapXml } from './sitemap-builder.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const BASE = join(__dirname, '..');
const SERVER = 'root@154.217.241.238';
const SITE_DIR = '/var/www/pdftool.work';
const TIMESTAMP = new Date().toISOString().replace(/[-:T]/g, '').slice(0, 14);

// SSH password from environment variable (required)
const SSH_PASS = process.env.SSH_PASS;
if (!SSH_PASS) {
  console.error('❌ SSH_PASS environment variable is not set.');
  console.error('   Please set it before running: export SSH_PASS="your-password"');
  process.exit(1);
}

/**
 * Generate and save sitemap.xml
 */
function generateSitemap() {
  console.log('🗺️  Generating sitemap.xml...');
  const htmlFiles = scanHtmlFiles(BASE);
  console.log(`   Found ${htmlFiles.length} HTML files`);
  
  const sitemapXml = generateSitemapXml(htmlFiles);
  const outputPath = join(BASE, 'sitemap.xml');
  writeFileSync(outputPath, sitemapXml, 'utf-8');
  console.log(`   ✅ sitemap.xml updated (${htmlFiles.length} URLs)`);
  return outputPath;
}

function sh(cmd, opts = {}) {
  try {
    const env = { ...process.env, ...(opts.env || {}) };
    const result = execSync(cmd, {
      cwd: BASE,
      env,
      encoding: 'utf-8',
      stdio: opts.silent ? 'pipe' : 'inherit',
      timeout: opts.timeout || 30000,
      ...opts,
    });
    return opts.silent ? result : '';
  } catch (e) {
    if (opts.ignoreError) return '';
    console.error(`❌ Command failed: ${cmd}`);
    console.error(e.message);
    process.exit(1);
  }
}

function sshe(cmd) {
  return sh(`SSHPASS='${SSH_PASS}' sshpass -e ssh -o StrictHostKeyChecking=no ${SERVER} "${cmd}"`, { timeout: 60000 });
}

function sshCopyFile(localPath, remotePath) {
  return sh(`SSHPASS='${SSH_PASS}' sshpass -e scp -o StrictHostKeyChecking=no ${localPath} ${SERVER}:${remotePath}`, { timeout: 30000 });
}

function main() {
  console.log('🚀 V6 Auto-Deploy - Phase 3\n');
  console.log(`📦 Release: ${TIMESTAMP}\n`);
  
  // Step 1: Git add + commit
  console.log('1️⃣ Git commit...');
  sh('git add .', { silent: true });
  
  const status = sh('git status --short', { silent: true });
  if (!status.trim()) {
    console.log('✅ Nothing to commit (all files up to date)');
  } else {
    const commitMsg = `feat: V6 auto-generated SEO pages (${TIMESTAMP})`;
    sh(`git commit -m "${commitMsg}"`, { timeout: 15000 });
    console.log(`✅ Committed: ${commitMsg}`);
    
    // Step 2: Git push
    console.log('\n2️⃣ Git push...');
    sh('git push origin main', { timeout: 30000 });
    console.log('✅ Pushed to origin/main');
  }
  
  // Step 2.5: Generate sitemap.xml
  console.log('\n2️⃣🔄 Generating sitemap...');
  const sitemapPath = generateSitemap();
  console.log('✅ Sitemap generated');
  
  // Step 3: Create release directory on server
  console.log('\n3️⃣ Server: creating release directory...');
  const releaseDir = `${SITE_DIR}/releases/${TIMESTAMP}`;
  sshe(`mkdir -p ${releaseDir} && chmod 755 ${releaseDir} && echo ok`);
  console.log(`✅ Created: ${releaseDir}`);
  
  // Step 4: Upload all files via tar
  console.log('\n4️⃣ Uploading files via tar...');
  
  // Get all HTML files + assets
  const htmlFiles = sh('ls *.html sitemap.xml robots.txt ads.txt dd6db5*.txt 2>/dev/null | tr "\\n" " "', { silent: true });
  
  if (htmlFiles.trim()) {
    sh(`tar cf - \$(ls *.html sitemap.xml robots.txt ads.txt dd6db5*.txt 2>/dev/null) | SSHPASS='${SSH_PASS}' sshpass -e ssh -o StrictHostKeyChecking=no ${SERVER} "cd ${releaseDir} && tar xf - && echo ok"`, { timeout: 120000 });
    console.log('✅ Uploaded HTML + config files');
  }
  
  // Upload assets
  if (existsSync(join(BASE, 'assets'))) {
    sh(`tar cf - assets | SSHPASS='${SSH_PASS}' sshpass -e ssh -o StrictHostKeyChecking=no ${SERVER} "cd ${releaseDir} && tar xf - && echo ok"`, { timeout: 120000 });
    console.log('✅ Uploaded assets/');
  }
  
  // Upload en/ directory
  if (existsSync(join(BASE, 'en'))) {
    const enTar = '/tmp/en-v6.tar';
    sh(`tar cf ${enTar} en`, { silent: true });
    sshCopyFile(enTar, enTar);
    sshe(`cd ${releaseDir} && mkdir -p en && cd en && tar xf ${enTar} && rm ${enTar} && echo ok`);
    console.log('✅ Uploaded en/ directory');
  }
  
  // Step 5: Fix permissions
  console.log('\n5️⃣ Fixing permissions...');
  sshe(`find ${releaseDir} -type d -exec chmod 755 {} \\; && find ${releaseDir} -type f -exec chmod 644 {} \\; && chown -R www-data:www-data ${releaseDir} && echo ok`);
  console.log('✅ Permissions fixed');
  
  // Step 6: Activate release
  console.log('\n6️⃣ Activating release...');
  sshe(`ln -sfn ${releaseDir} ${SITE_DIR}/current.next && mv -Tb ${SITE_DIR}/current.next ${SITE_DIR}/current && echo ok`);
  console.log('✅ Activated: current → ' + TIMESTAMP);
  
  // Step 7: Reload nginx
  console.log('\n7️⃣ Reloading nginx...');
  sshe('systemctl reload nginx && echo ok');
  console.log('✅ Nginx reloaded');
  
  // Step 8: Verify
  console.log('\n8️⃣ Verifying...');
  const results = [];
  for (const path of ['/', 'upload-ready.html', 'compress.html', 'seo-action-pdf-compress-online.html']) {
    try {
      const res = execSync(`curl -so /dev/null -w "%{http_code}" "https://pdftool.work/${path}"`, { timeout: 10000, encoding: 'utf-8' });
      results.push(`${res} ${path}`);
    } catch(e) {
      results.push(`ERR ${path}`);
    }
  }
  results.forEach(r => console.log(`  ${r}`));
  
  console.log(`\n🎉 V6 Auto-Deploy 完成！`);
  console.log(`📦 Release: ${TIMESTAMP}`);
  console.log(`🌐 https://pdftool.work`);
}

main();
