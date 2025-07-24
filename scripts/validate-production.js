#!/usr/bin/env node
/**
 * Production validation script for CellularLab
 * Validates bundle size, performance, accessibility, and functionality
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

console.log('🚀 Starting CellularLab Production Validation\n');

// Color codes for terminal output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function logSuccess(message) {
  log(`✅ ${message}`, colors.green);
}

function logWarning(message) {
  log(`⚠️  ${message}`, colors.yellow);
}

function logError(message) {
  log(`❌ ${message}`, colors.red);
}

function logInfo(message) {
  log(`ℹ️  ${message}`, colors.blue);
}

let hasErrors = false;
let hasWarnings = false;

// Performance targets from spec.md
const PERFORMANCE_TARGETS = {
  maxBundleSize: 5 * 1024 * 1024, // 5MB
  maxLoadTime: 2000, // 2 seconds
  targetFPS: 60,
  maxRuleSwitchingTime: 50, // 50ms
  maxGenerationTime: 16, // 16ms for 60fps
  maxMemoryUsage: 100 * 1024 * 1024 // 100MB
};

function validateStep(stepName, validationFn) {
  log(`\n${colors.bold}${stepName}${colors.reset}`);
  log('─'.repeat(50));
  
  try {
    return validationFn();
  } catch (error) {
    logError(`Validation failed: ${error.message}`);
    hasErrors = true;
    return false;
  }
}

// Step 1: Build the project
validateStep('Building Project', () => {
  logInfo('Running production build...');
  
  try {
    execSync('npm run build', { 
      cwd: projectRoot, 
      stdio: 'pipe',
      encoding: 'utf8'
    });
    logSuccess('Production build completed successfully');
    return true;
  } catch (error) {
    logError('Production build failed');
    console.error(error.stdout || error.message);
    hasErrors = true;
    return false;
  }
});

// Step 2: Validate bundle size
validateStep('Bundle Size Analysis', () => {
  const distPath = path.join(projectRoot, 'dist');
  
  if (!fs.existsSync(distPath)) {
    logError('Dist directory not found');
    hasErrors = true;
    return false;
  }
  
  let totalSize = 0;
  const files = {};
  
  function scanDirectory(dir) {
    const items = fs.readdirSync(dir);
    
    for (const item of items) {
      const itemPath = path.join(dir, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        scanDirectory(itemPath);
      } else {
        const relativePath = path.relative(distPath, itemPath);
        const size = stat.size;
        files[relativePath] = size;
        totalSize += size;
      }
    }
  }
  
  scanDirectory(distPath);
  
  const totalSizeMB = totalSize / 1024 / 1024;
  const targetSizeMB = PERFORMANCE_TARGETS.maxBundleSize / 1024 / 1024;
  
  logInfo(`Total bundle size: ${totalSizeMB.toFixed(2)}MB`);
  logInfo(`Target: <${targetSizeMB}MB`);
  
  // Show largest files
  const sortedFiles = Object.entries(files)
    .sort(([,a], [,b]) => b - a)
    .slice(0, 10);
    
  log('\nLargest files:');
  for (const [file, size] of sortedFiles) {
    const sizeMB = (size / 1024 / 1024).toFixed(2);
    log(`  ${file}: ${sizeMB}MB`);
  }
  
  if (totalSize > PERFORMANCE_TARGETS.maxBundleSize) {
    logError(`Bundle size exceeds target by ${(totalSizeMB - targetSizeMB).toFixed(2)}MB`);
    hasErrors = true;
    return false;
  } else if (totalSize > PERFORMANCE_TARGETS.maxBundleSize * 0.8) {
    logWarning(`Bundle size is close to target (${((totalSize / PERFORMANCE_TARGETS.maxBundleSize) * 100).toFixed(1)}%)`);
    hasWarnings = true;
  } else {
    logSuccess(`Bundle size is within target (${((totalSize / PERFORMANCE_TARGETS.maxBundleSize) * 100).toFixed(1)}%)`);
  }
  
  return true;
});

// Step 3: Run all tests
validateStep('Test Suite Execution', () => {
  logInfo('Running unit tests...');
  
  try {
    const output = execSync('npm test -- --run', { 
      cwd: projectRoot, 
      encoding: 'utf8',
      stdio: 'pipe'
    });
    
    // Parse test results
    const lines = output.split('\n');
    const testResults = lines.find(line => line.includes('Tests'));
    
    if (testResults) {
      logInfo(testResults);
      
      if (testResults.includes('failed')) {
        const failedMatch = testResults.match(/(\d+) failed/);
        if (failedMatch && parseInt(failedMatch[1]) > 0) {
          logError('Some tests are failing');
          hasErrors = true;
          return false;
        }
      }
    }
    
    logSuccess('All tests passed');
    return true;
    
  } catch (error) {
    logError('Tests failed');
    console.error(error.stdout || error.message);
    hasErrors = true;
    return false;
  }
});

// Step 4: TypeScript compilation check
validateStep('TypeScript Validation', () => {
  logInfo('Running TypeScript compiler check...');
  
  try {
    execSync('npm run typecheck', { 
      cwd: projectRoot, 
      stdio: 'pipe',
      encoding: 'utf8'
    });
    logSuccess('TypeScript compilation successful');
    return true;
  } catch (error) {
    logError('TypeScript compilation failed');
    console.error(error.stdout || error.message);
    hasErrors = true;
    return false;
  }
});

// Step 5: Linting validation
validateStep('Code Quality Check', () => {
  logInfo('Running ESLint...');
  
  try {
    execSync('npm run lint', { 
      cwd: projectRoot, 
      stdio: 'pipe',
      encoding: 'utf8'
    });
    logSuccess('Code quality check passed');
    return true;
  } catch (error) {
    logError('Linting issues found');
    console.error(error.stdout || error.message);
    hasWarnings = true; // Linting issues are warnings, not errors
    return true;
  }
});

// Step 6: Accessibility validation
validateStep('Accessibility Validation', () => {
  logInfo('Checking accessibility implementation...');
  
  const accessibilityFiles = [
    'src/hooks/useAccessibility.ts',
    'src/utils/ErrorHandler.ts',
    'src/styles/accessibility.css'
  ];
  
  let allFilesExist = true;
  
  for (const file of accessibilityFiles) {
    const filePath = path.join(projectRoot, file);
    if (fs.existsSync(filePath)) {
      logSuccess(`Found ${file}`);
    } else {
      logError(`Missing ${file}`);
      allFilesExist = false;
      hasErrors = true;
    }
  }
  
  // Check for ARIA attributes in App.tsx
  const appPath = path.join(projectRoot, 'src/App.tsx');
  if (fs.existsSync(appPath)) {
    const appContent = fs.readFileSync(appPath, 'utf8');
    
    const ariaChecks = [
      { pattern: /aria-label/g, name: 'aria-label' },
      { pattern: /aria-live/g, name: 'aria-live' },
      { pattern: /aria-pressed/g, name: 'aria-pressed' },
      { pattern: /role=/g, name: 'role attributes' },
      { pattern: /aria-labelledby/g, name: 'aria-labelledby' }
    ];
    
    for (const check of ariaChecks) {
      const matches = appContent.match(check.pattern);
      if (matches && matches.length > 0) {
        logSuccess(`Found ${matches.length} ${check.name} attributes`);
      } else {
        logWarning(`No ${check.name} attributes found`);
        hasWarnings = true;
      }
    }
  }
  
  return allFilesExist;
});

// Step 7: Performance validation
validateStep('Performance Requirements Check', () => {
  logInfo('Validating performance targets...');
  
  // Check if performance monitoring is implemented
  const perfProfilerPath = path.join(projectRoot, 'src/utils/PerformanceProfiler.ts');
  
  if (!fs.existsSync(perfProfilerPath)) {
    logError('PerformanceProfiler not found');
    hasErrors = true;
    return false;
  }
  
  const perfContent = fs.readFileSync(perfProfilerPath, 'utf8');
  
  // Check for key performance methods
  const perfChecks = [
    'measureOperationTime',
    'runBenchmarks',
    'generateReport',
    'startMonitoring',
    'stopMonitoring'
  ];
  
  for (const method of perfChecks) {
    if (perfContent.includes(method)) {
      logSuccess(`Found ${method} method`);
    } else {
      logError(`Missing ${method} method`);
      hasErrors = true;
    }
  }
  
  // Check if targets are defined
  const targetsPattern = /targetFPS.*60|maxMemoryMB.*100|maxLoadTimeMS.*2000/g;
  const targetMatches = perfContent.match(targetsPattern);
  
  if (targetMatches && targetMatches.length > 0) {
    logSuccess(`Found ${targetMatches.length} performance targets`);
  } else {
    logWarning('Performance targets not clearly defined');
    hasWarnings = true;
  }
  
  return true;
});

// Step 8: Browser compatibility check
validateStep('Browser Compatibility Check', () => {
  logInfo('Checking browser compatibility features...');
  
  const indexHtmlPath = path.join(projectRoot, 'dist/index.html');
  
  if (!fs.existsSync(indexHtmlPath)) {
    logError('dist/index.html not found');
    hasErrors = true;
    return false;
  }
  
  const htmlContent = fs.readFileSync(indexHtmlPath, 'utf8');
  
  // Check for modern browser features
  const browserChecks = [
    { pattern: /<script[^>]*type="module"/i, name: 'ES6 modules', required: true },
    { pattern: /viewport/i, name: 'viewport meta tag', required: true },
    { pattern: /charset/i, name: 'character encoding', required: true }
  ];
  
  for (const check of browserChecks) {
    if (htmlContent.match(check.pattern)) {
      logSuccess(`Found ${check.name}`);
    } else if (check.required) {
      logError(`Missing ${check.name}`);
      hasErrors = true;
    } else {
      logWarning(`Missing ${check.name}`);
      hasWarnings = true;
    }
  }
  
  return true;
});

// Step 9: File structure validation
validateStep('Project Structure Validation', () => {
  logInfo('Validating project structure...');
  
  const requiredFiles = [
    'package.json',
    'vite.config.ts',
    'tsconfig.json',
    'tailwind.config.js',
    'src/App.tsx',
    'src/main.tsx',
    'src/index.css',
    'dist/index.html'
  ];
  
  const requiredDirs = [
    'src/components',
    'src/stores',
    'src/utils',
    'src/types',
    'src/engines',
    'src/hooks',
    'tests/unit',
    'tests/e2e'
  ];
  
  let allValid = true;
  
  for (const file of requiredFiles) {
    const filePath = path.join(projectRoot, file);
    if (fs.existsSync(filePath)) {
      logSuccess(`✓ ${file}`);
    } else {
      logError(`✗ ${file}`);
      allValid = false;
      hasErrors = true;
    }
  }
  
  for (const dir of requiredDirs) {
    const dirPath = path.join(projectRoot, dir);
    if (fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory()) {
      logSuccess(`✓ ${dir}/`);
    } else {
      logError(`✗ ${dir}/`);
      allValid = false;
      hasErrors = true;
    }
  }
  
  return allValid;
});

// Step 10: Generate final report
validateStep('Final Validation Report', () => {
  log('\n' + '='.repeat(60));
  log(`${colors.bold}CELLULAR LAB PRODUCTION VALIDATION REPORT${colors.reset}`);
  log('='.repeat(60));
  
  const bundlePath = path.join(projectRoot, 'dist');
  const stats = fs.existsSync(bundlePath) ? fs.statSync(bundlePath) : null;
  
  if (stats) {
    log(`Build Date: ${stats.mtime.toISOString()}`);
  }
  
  log(`Node Version: ${process.version}`);
  log(`Platform: ${process.platform}`);
  
  log('\n📊 Performance Targets:');
  log(`  Bundle Size: <${PERFORMANCE_TARGETS.maxBundleSize / 1024 / 1024}MB`);
  log(`  Load Time: <${PERFORMANCE_TARGETS.maxLoadTime}ms`);
  log(`  Target FPS: ${PERFORMANCE_TARGETS.targetFPS}`);
  log(`  Rule Switching: <${PERFORMANCE_TARGETS.maxRuleSwitchingTime}ms`);
  log(`  Generation Time: <${PERFORMANCE_TARGETS.maxGenerationTime}ms`);
  
  log('\n🎯 Validation Summary:');
  
  if (hasErrors) {
    logError('VALIDATION FAILED - Critical issues found');
    log('\nPlease fix the errors above before deploying to production.');
    process.exit(1);
  } else if (hasWarnings) {
    logWarning('VALIDATION PASSED WITH WARNINGS');
    log('\nConsider addressing the warnings above for optimal production deployment.');
  } else {
    logSuccess('ALL VALIDATIONS PASSED');
    log('\n🎉 CellularLab is ready for production deployment!');
  }
  
  log('\n📋 Next Steps:');
  log('  1. Test the built application in dist/ folder');
  log('  2. Run E2E tests: npm run test:e2e');
  log('  3. Performance test on target devices');
  log('  4. Accessibility test with screen readers');
  log('  5. Deploy to production environment');
  
  return true;
});

process.exit(hasErrors ? 1 : 0);