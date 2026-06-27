// Script to verify the Scanner Engine locally
const { scanProject } = require('./scanner');

async function testScanner() {
  console.log('Testing scanner on current directory...');
  const startTime = Date.now();
  
  try {
    const stats = await scanProject(__dirname);
    const duration = Date.now() - startTime;
    
    console.log('\n--- SCANNING COMPLETED IN', duration, 'ms ---');
    console.log('Project Name:', stats.projectName);
    console.log('Project Path:', stats.projectPath);
    console.log('Total Files Scanned:', stats.totalFiles);
    console.log('Total Lines of Code (LOC):', stats.totalLinesOfCode);
    console.log('Primary Language:', stats.primaryLanguage);
    console.log('Estimated Complexity:', stats.complexity);
    console.log('Package Manager:', stats.packageManager);
    console.log('Entry Point File:', stats.entryPoint);
    console.log('Detected License:', stats.licenseType);
    console.log('CI/CD Pipelines:', stats.ciCd.join(', ') || 'None');
    console.log('Docker Supported:', stats.hasDocker);
    console.log('Git Configured:', stats.hasGit);
    if (stats.hasGit) {
      console.log('  Branch:', stats.gitInfo.branch);
      console.log('  Commit Count:', stats.gitInfo.commits);
      console.log('  Author:', stats.gitInfo.author);
    }
    
    console.log('\n--- LANGUAGES BREAKDOWN ---');
    Object.entries(stats.languages).forEach(([lang, data]) => {
      console.log(`- ${lang}: ${data.count} files, ${data.loc} LOC`);
    });

    console.log('\n--- DETECTED FRAMEWORKS ---');
    console.log(stats.frameworks.join(', ') || 'None detected');

    console.log('\n--- DETECTED CONFIG FILES ---');
    console.log(stats.configFiles.join(', ') || 'None');

    console.log('\n--- PROJECT TREE DRAFT (Top Level) ---');
    if (stats.projectTree && stats.projectTree.children) {
      stats.projectTree.children.slice(0, 10).forEach(node => {
        console.log(`  [${node.type}] ${node.name}`);
      });
      if (stats.projectTree.children.length > 10) {
        console.log(`  ... and ${stats.projectTree.children.length - 10} more items`);
      }
    }

    console.log('\n--- MERMAID DIAGRAM ---');
    console.log(stats.architectureDiagram);

    console.log('\nVerification complete!');
  } catch (error) {
    console.error('Error during scanning test:', error);
  }
}

testScanner();
