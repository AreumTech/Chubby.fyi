#!/usr/bin/env node

/**
 * Content Build Script
 * 
 * Processes markdown files from /docs/content into a structured content.json file
 * for use in the PathFinder Pro application.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONTENT_DIR = path.join(__dirname, '..', 'docs', 'content');
const OUTPUT_FILE = path.join(__dirname, '..', 'public', 'content.json');

/**
 * Parses front matter from markdown content
 * @param {string} content - Raw markdown content
 * @returns {object} - Parsed front matter and content
 */
function parseFrontMatter(content) {
  const frontMatterRegex = /^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/;
  const match = content.match(frontMatterRegex);
  
  if (!match) {
    return { metadata: {}, content: content };
  }
  
  const [, frontMatter, markdownContent] = match;
  const metadata = {};
  
  // Parse YAML-like front matter
  frontMatter.split('\n').forEach(line => {
    const [key, ...valueParts] = line.split(':');
    if (key && valueParts.length > 0) {
      const value = valueParts.join(':').trim().replace(/^["']|["']$/g, '');
      metadata[key.trim()] = value;
    }
  });
  
  return { metadata, content: markdownContent.trim() };
}

/**
 * Recursively processes a directory for markdown files
 * @param {string} dir - Directory to process
 * @param {string} baseDir - Base content directory
 * @returns {array} - Array of processed content items
 */
function processDirectory(dir, baseDir = CONTENT_DIR) {
  const items = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    
    if (entry.isDirectory()) {
      // Recursively process subdirectories
      const subItems = processDirectory(fullPath, baseDir);
      items.push(...subItems);
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      // Process markdown files
      const content = fs.readFileSync(fullPath, 'utf8');
      const { metadata, content: markdownContent } = parseFrontMatter(content);
      
      // Create relative path for ID
      const relativePath = path.relative(baseDir, fullPath);
      const id = relativePath.replace(/\.md$/, '').replace(/\\/g, '/');
      
      items.push({
        id,
        path: relativePath,
        ...metadata,
        content: markdownContent,
        lastModified: fs.statSync(fullPath).mtime.toISOString()
      });
    }
  }
  
  return items;
}

/**
 * Main build function
 */
function buildContent() {
  console.log('🔧 Building content from markdown files...');
  
  // Check if content directory exists
  if (!fs.existsSync(CONTENT_DIR)) {
    console.log('📁 Content directory not found, creating empty content.json');
    const emptyContent = {
      strategies: [],
      guides: [],
      metadata: {
        buildTime: new Date().toISOString(),
        totalItems: 0
      }
    };
    
    // Ensure public directory exists
    const publicDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(emptyContent, null, 2));
    console.log('✅ Empty content.json created');
    return;
  }
  
  try {
    // Process all markdown files
    const allContent = processDirectory(CONTENT_DIR);
    
    // Organize content by category
    const organizedContent = {
      strategies: allContent.filter(item => item.category === 'Investment' || item.category === 'Tax' || item.strategyId),
      guides: allContent.filter(item => !item.strategyId && item.category !== 'Investment' && item.category !== 'Tax'),
      all: allContent
    };
    
    // Add metadata
    const contentStructure = {
      ...organizedContent,
      metadata: {
        buildTime: new Date().toISOString(),
        totalItems: allContent.length,
        categories: [...new Set(allContent.map(item => item.category).filter(Boolean))],
        strategyIds: [...new Set(allContent.map(item => item.strategyId).filter(Boolean))],
        difficulties: [...new Set(allContent.map(item => item.difficulty).filter(Boolean))]
      }
    };
    
    // Ensure public directory exists
    const publicDir = path.dirname(OUTPUT_FILE);
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    // Write output file
    fs.writeFileSync(OUTPUT_FILE, JSON.stringify(contentStructure, null, 2));
    
    console.log(`✅ Content build complete!`);
    console.log(`   📄 ${allContent.length} items processed`);
    console.log(`   📊 ${organizedContent.strategies.length} strategies`);
    console.log(`   📚 ${organizedContent.guides.length} guides`);
    console.log(`   💾 Output: ${path.relative(process.cwd(), OUTPUT_FILE)}`);
    
  } catch (error) {
    console.error('❌ Content build failed:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  buildContent();
}

export { buildContent };