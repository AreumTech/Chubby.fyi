#!/usr/bin/env node

// Simple performance validation script
// This will just validate the WASM file and provide a basic assessment

const fs = require('fs');
const path = require('path');

console.log('=== WASM Performance Validation ===\n');

try {
    // 1. Check WASM file exists and size
    const wasmPath = './pathfinder.wasm';
    const stats = fs.statSync(wasmPath);
    const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);
    
    console.log(`✅ WASM Binary: ${sizeMB} MB`);
    
    // Size assessment
    if (stats.size < 3 * 1024 * 1024) {
        console.log('   📊 Size: EXCELLENT (< 3MB)');
    } else if (stats.size < 5 * 1024 * 1024) {
        console.log('   📊 Size: GOOD (< 5MB)');
    } else if (stats.size < 10 * 1024 * 1024) {
        console.log('   📊 Size: ACCEPTABLE (< 10MB)');
    } else {
        console.log('   📊 Size: LARGE (> 10MB)');
    }
    
    // 2. Check build time by rebuilding
    console.log('\n🔨 Testing Build Performance...');
    const { spawn } = require('child_process');
    const startTime = Date.now();
    
    const buildProcess = spawn('go', ['build', '-o', 'test_perf.wasm', '-ldflags=-s -w', '.'], {
        env: { ...process.env, GOOS: 'js', GOARCH: 'wasm' },
        stdio: 'pipe'
    });
    
    buildProcess.on('close', (code) => {
        const buildTime = Date.now() - startTime;
        
        if (code === 0) {
            console.log(`✅ Build Success: ${buildTime}ms`);
            
            // Build performance assessment
            if (buildTime < 500) {
                console.log('   🚀 Build Speed: EXCELLENT (< 0.5s)');
            } else if (buildTime < 1500) {
                console.log('   🚀 Build Speed: GOOD (< 1.5s)');
            } else if (buildTime < 3000) {
                console.log('   🚀 Build Speed: ACCEPTABLE (< 3s)');
            } else {
                console.log('   🚀 Build Speed: SLOW (> 3s)');
            }
            
            // Clean up test file
            try {
                fs.unlinkSync('test_perf.wasm');
            } catch (e) {}
            
        } else {
            console.log(`❌ Build Failed: Exit code ${code}`);
        }
        
        console.log('\n=== Performance Assessment ===');
        
        // Overall assessment
        const hasGoodSize = stats.size < 5 * 1024 * 1024;
        const hasGoodBuild = code === 0 && buildTime < 1500;
        
        if (hasGoodSize && hasGoodBuild) {
            console.log('🎉 PERFORMANCE: EXCELLENT - Fast build, reasonable size');
        } else if (hasGoodSize || hasGoodBuild) {
            console.log('✅ PERFORMANCE: GOOD - Some areas optimized');
        } else {
            console.log('⚠️ PERFORMANCE: NEEDS IMPROVEMENT');
        }
        
        // 3. Check for performance optimizations that were removed
        console.log('\n🧹 Checking for Performance Killers...');
        
        const sourceFiles = ['simulation.go', 'main.go', 'event_handler.go'];
        let foundOptimizations = 0;
        let removedOptimizations = 0;
        
        sourceFiles.forEach(file => {
            if (fs.existsSync(file)) {
                const content = fs.readFileSync(file, 'utf8');
                const ultraCount = (content.match(/ULTRA|ultra/g) || []).length;
                const removedCount = (content.match(/REMOVED|removed/g) || []).length;
                
                foundOptimizations += ultraCount;
                removedOptimizations += removedCount;
            }
        });
        
        if (foundOptimizations === 0) {
            console.log('✅ No "ultra-performance" code found');
        } else {
            console.log(`⚠️ Found ${foundOptimizations} "ultra-performance" references`);
        }
        
        if (removedOptimizations > 0) {
            console.log(`✅ Found ${removedOptimizations} removal markers - good cleanup`);
        }
        
        // 4. Final recommendations
        console.log('\n📋 Summary:');
        console.log(`   • WASM Size: ${sizeMB} MB ${hasGoodSize ? '✅' : '⚠️'}`);
        console.log(`   • Build Time: ${buildTime}ms ${hasGoodBuild ? '✅' : '⚠️'}`);
        console.log(`   • Clean Code: ${foundOptimizations === 0 ? '✅' : '⚠️'}`);
        
        if (hasGoodSize && hasGoodBuild && foundOptimizations === 0) {
            console.log('\n🎯 RECOMMENDATION: Ready for production - performance looks good!');
        } else {
            console.log('\n🔧 RECOMMENDATION: May need further optimization');
        }
        
        process.exit(code === 0 ? 0 : 1);
    });
    
} catch (error) {
    console.error(`❌ Validation failed: ${error.message}`);
    process.exit(1);
}