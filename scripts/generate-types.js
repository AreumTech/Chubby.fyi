#!/usr/bin/env node

import { compileFromFile } from 'json-schema-to-typescript';
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const SCHEMAS_DIR = join(__dirname, '..', 'schemas');
const OUTPUT_DIR = join(__dirname, '..', 'src', 'types', 'generated');

// Schema files to compile (in dependency order)
const SCHEMA_FILES = [
  'financial-event.json',
  'account-holdings.json', 
  'monthly-data.json',
  'simulation-input.json',
  'simulation-result.json',
  'simulation-results.json'
];

async function ensureDir(dir) {
  try {
    await fs.access(dir);
  } catch {
    await fs.mkdir(dir, { recursive: true });
  }
}

async function generateTypesFromSchema(schemaFile) {
  console.log(`Generating types for ${schemaFile}...`);
  
  const schemaPath = join(SCHEMAS_DIR, schemaFile);
  const outputFileName = schemaFile.replace('.json', '.ts');
  const outputPath = join(OUTPUT_DIR, outputFileName);
  
  try {
    const typescript = await compileFromFile(schemaPath, {
      cwd: SCHEMAS_DIR,
      $refOptions: {
        resolve: {
          file: true
        }
      },
      style: {
        singleQuote: true,
        semi: true,
        trailingComma: 'es5',
        printWidth: 100
      },
      bannerComment: '/* eslint-disable */\n/**\n * This file was automatically generated from JSON Schema.\n * DO NOT MODIFY IT BY HAND. Instead, modify the source JSON Schema file,\n * and run npm run generate-types to regenerate this file.\n */',
      additionalProperties: false,
      enableConstEnums: true,
      format: true
    });
    
    await fs.writeFile(outputPath, typescript);
    console.log(`✓ Generated ${outputFileName}`);
  } catch (error) {
    console.error(`✗ Error generating types for ${schemaFile}:`, error.message);
    throw error;
  }
}

async function generateIndexFile() {
  const indexContent = `/* eslint-disable */
/**
 * This file was automatically generated.
 * DO NOT MODIFY IT BY HAND. Instead, run npm run generate-types to regenerate this file.
 */

// Core data structures
export * from './financial-event';
export * from './account-holdings'; 
export * from './monthly-data';

// Simulation types
export * from './simulation-input';
export * from './simulation-result';
export * from './simulation-results';
`;

  const indexPath = join(OUTPUT_DIR, 'index.ts');
  await fs.writeFile(indexPath, indexContent);
  console.log('✓ Generated index.ts');
}

async function main() {
  console.log('🔧 Generating TypeScript types from JSON Schema...\n');
  
  try {
    // Ensure output directory exists
    await ensureDir(OUTPUT_DIR);
    
    // Generate types for each schema
    for (const schemaFile of SCHEMA_FILES) {
      await generateTypesFromSchema(schemaFile);
    }
    
    // Generate index file
    await generateIndexFile();
    
    console.log('\n✅ Type generation completed successfully!');
    console.log(`Generated files in: ${OUTPUT_DIR}`);
    
  } catch (error) {
    console.error('\n❌ Type generation failed:', error.message);
    process.exit(1);
  }
}

main();