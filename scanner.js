const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// Standard folders to ignore during scanning
const IGNORED_FOLDERS = new Set([
  'node_modules', '.git', 'dist', 'build', '.next', '.nuxt', 'out',
  'venv', '.venv', '__pycache__', 'target', 'bin', 'obj', 'vendor',
  '.idea', '.vscode', 'tmp', 'coverage', '.cache', 'bower_components'
]);

// Map of file extensions to programming language names
const EXTENSION_MAP = {
  '.js': 'JavaScript',
  '.jsx': 'JavaScript React',
  '.ts': 'TypeScript',
  '.tsx': 'TypeScript React',
  '.py': 'Python',
  '.java': 'Java',
  '.cpp': 'C++',
  '.c': 'C',
  '.h': 'C/C++ Header',
  '.cs': 'C#',
  '.go': 'Go',
  '.rs': 'Rust',
  '.rb': 'Ruby',
  '.php': 'PHP',
  '.html': 'HTML',
  '.css': 'CSS',
  '.scss': 'SCSS',
  '.sass': 'Sass',
  '.less': 'Less',
  '.json': 'JSON',
  '.toml': 'TOML',
  '.yaml': 'YAML',
  '.yml': 'YAML',
  '.md': 'Markdown',
  '.sh': 'Shell Script',
  '.bat': 'Batch File',
  '.ps1': 'PowerShell Script',
  '.swift': 'Swift',
  '.kt': 'Kotlin',
  '.gradle': 'Gradle',
  '.xml': 'XML',
  '.sql': 'SQL',
  '.r': 'R',
  '.pl': 'Perl',
  '.m': 'Objective-C',
  '.scala': 'Scala',
  '.dart': 'Dart',
  '.lua': 'Lua',
  '.groovy': 'Groovy',
  '.csproj': 'C# Project'
};

// Check if file is a code/text file we care to count LOC for
function isCodeFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return ext in EXTENSION_MAP;
}

// Function to run a shell command safely inside a promise
function runCommand(command, cwd) {
  return new Promise((resolve) => {
    exec(command, { cwd, timeout: 5000 }, (error, stdout, stderr) => {
      if (error) {
        resolve({ success: false, error: error.message });
      } else {
        resolve({ success: true, stdout: stdout.trim(), stderr: stderr.trim() });
      }
    });
  });
}

// Main Scan function
async function scanProject(projectPath) {
  const stats = {
    projectName: path.basename(projectPath),
    projectPath,
    totalFiles: 0,
    totalLinesOfCode: 0,
    languages: {}, // name -> { count, loc }
    frameworks: [],
    dependencies: [],
    devDependencies: [],
    packageManager: 'None',
    configFiles: [],
    hasDocker: false,
    hasGit: false,
    gitInfo: { branch: 'N/A', commits: 0, author: 'N/A' },
    ciCd: [],
    hasLicense: false,
    licenseType: 'None',
    envFiles: [],
    hasGitignore: false,
    hasTests: false,
    testCoverage: { detected: false, files: [] },
    largestFiles: [], // { path, size, loc }
    docFiles: [], // { name, path }
    projectTree: null,
    complexity: 'Low',
    architectureDiagram: ''
  };

  // Check Git usage
  const gitPath = path.join(projectPath, '.git');
  if (fs.existsSync(gitPath)) {
    stats.hasGit = true;
    const branchRes = await runCommand('git rev-parse --abbrev-ref HEAD', projectPath);
    if (branchRes.success) stats.gitInfo.branch = branchRes.stdout;
    
    const commitRes = await runCommand('git rev-list --count HEAD', projectPath);
    if (commitRes.success) stats.gitInfo.commits = parseInt(commitRes.stdout, 10) || 0;

    const authorRes = await runCommand('git log -1 --format="%an <%ae>"', projectPath);
    if (authorRes.success) stats.gitInfo.author = authorRes.stdout;
  }

  // Temporary list to find largest files
  const fileList = [];
  
  // Tree building helper
  function buildTree(dirPath, depth = 0) {
    if (depth > 3) return null; // limit depth to 3 for projectTree
    
    let items;
    try {
      items = fs.readdirSync(dirPath);
    } catch (e) {
      return null;
    }

    const nodes = [];
    for (const item of items) {
      if (IGNORED_FOLDERS.has(item)) continue;
      const fullPath = path.join(dirPath, item);
      let isDir = false;
      try {
        isDir = fs.statSync(fullPath).isDirectory();
      } catch (e) {
        continue;
      }

      if (isDir) {
        const children = buildTree(fullPath, depth + 1);
        nodes.push({
          name: item,
          type: 'directory',
          children: children
        });
      } else {
        nodes.push({
          name: item,
          type: 'file'
        });
      }
    }
    // Sort directories first, then files alphabetically
    nodes.sort((a, b) => {
      if (a.type !== b.type) {
        return a.type === 'directory' ? -1 : 1;
      }
      return a.name.localeCompare(b.name);
    });
    return nodes;
  }

  stats.projectTree = {
    name: stats.projectName,
    type: 'directory',
    children: buildTree(projectPath, 0)
  };

  // Recursive folder scanner
  function walkDir(dirPath) {
    let items;
    try {
      items = fs.readdirSync(dirPath);
    } catch (e) {
      return;
    }

    for (const item of items) {
      if (IGNORED_FOLDERS.has(item)) continue;
      const fullPath = path.join(dirPath, item);
      let stat;
      try {
        stat = fs.statSync(fullPath);
      } catch (e) {
        continue;
      }

      if (stat.isDirectory()) {
        // Look for CI/CD directories
        if (item === '.github' && fs.existsSync(path.join(fullPath, 'workflows'))) {
          stats.ciCd.push('GitHub Actions');
        } else if (item === '.gitlab' && fs.existsSync(path.join(fullPath, 'workflows'))) {
          stats.ciCd.push('GitLab CI');
        }
        
        // Walk subdirectory
        walkDir(fullPath);
      } else {
        stats.totalFiles++;
        const ext = path.extname(item).toLowerCase();
        
        // Detect Config Files
        const lowerItem = item.toLowerCase();
        if ([
          'package.json', 'pyproject.toml', 'requirements.txt', 'cargo.toml',
          'go.mod', 'pom.xml', 'build.gradle', 'composer.json', 'csproj'
        ].some(config => lowerItem.endsWith(config)) || ext === '.csproj') {
          stats.configFiles.push(item);
        }

        // Environment files
        if (lowerItem.startsWith('.env')) {
          stats.envFiles.push(item);
        }

        // Gitignore check
        if (item === '.gitignore') {
          stats.hasGitignore = true;
        }

        // Docker support check
        if (item === 'Dockerfile' || item === 'docker-compose.yml' || item === 'docker-compose.yaml') {
          stats.hasDocker = true;
        }

        // CI/CD files
        if (item === '.gitlab-ci.yml') {
          stats.ciCd.push('GitLab CI');
        } else if (item === 'azure-pipelines.yml') {
          stats.ciCd.push('Azure Pipelines');
        } else if (item === 'appveyor.yml') {
          stats.ciCd.push('AppVeyor');
        } else if (item === '.travis.yml') {
          stats.ciCd.push('Travis CI');
        }

        // Licenses
        if (lowerItem.startsWith('license')) {
          stats.hasLicense = true;
          try {
            const licContent = fs.readFileSync(fullPath, 'utf8').substring(0, 1000);
            if (licContent.includes('MIT License') || licContent.includes('MIT')) {
              stats.licenseType = 'MIT';
            } else if (licContent.includes('Apache License 2.0') || licContent.includes('Apache')) {
              stats.licenseType = 'Apache-2.0';
            } else if (licContent.includes('GNU General Public') || licContent.includes('GPL')) {
              stats.licenseType = 'GPL-3.0';
            } else if (licContent.includes('BSD License')) {
              stats.licenseType = 'BSD';
            } else {
              stats.licenseType = 'Custom/Unknown';
            }
          } catch (e) {
            stats.licenseType = 'Detected (Unreadable)';
          }
        }

        // Docs files
        if (ext === '.md' && item !== 'README.md' && !IGNORED_FOLDERS.has(path.basename(dirPath))) {
          stats.docFiles.push({
            name: item,
            path: path.relative(projectPath, fullPath)
          });
        }

        // Check if test file
        if (
          lowerItem.includes('test') || 
          lowerItem.includes('spec') || 
          dirPath.includes('test') || 
          dirPath.includes('tests') || 
          dirPath.includes('__tests__')
        ) {
          if (isCodeFile(fullPath)) {
            stats.hasTests = true;
          }
        }

        // Check for test coverage artifacts
        if (
          lowerItem === 'lcov.info' || 
          lowerItem === 'cobertura-coverage.xml' || 
          lowerItem === 'coverage-final.json'
        ) {
          stats.testCoverage.detected = true;
          stats.testCoverage.files.push(item);
        }

        // Language & LOC calculation
        if (isCodeFile(fullPath)) {
          const lang = EXTENSION_MAP[ext] || 'Unknown';
          let loc = 0;
          
          try {
            // Read file only if under 2MB for LOC count
            if (stat.size < 2 * 1024 * 1024) {
              const content = fs.readFileSync(fullPath, 'utf8');
              loc = content.split('\n').length;
            }
          } catch (e) {
            // Unreadable / binary files
          }

          if (!stats.languages[lang]) {
            stats.languages[lang] = { count: 0, loc: 0 };
          }
          stats.languages[lang].count++;
          stats.languages[lang].loc += loc;
          stats.totalLinesOfCode += loc;

          fileList.push({
            path: path.relative(projectPath, fullPath),
            size: stat.size,
            loc: loc
          });
        }
      }
    }
  }

  walkDir(projectPath);

  // Set missing alerts
  stats.hasReadme = fs.existsSync(path.join(projectPath, 'README.md')) || fs.existsSync(path.join(projectPath, 'readme.md'));
  stats.missingReadme = !stats.hasReadme;
  stats.missingGitignore = !stats.hasGitignore;
  stats.missingLicense = !stats.hasLicense;
  stats.missingTests = !stats.hasTests;

  // Process largest files
  fileList.sort((a, b) => b.size - a.size);
  stats.largestFiles = fileList.slice(0, 5);

  // Read config files to parse dependencies and frameworks
  for (const configFile of stats.configFiles) {
    const fullPath = path.join(projectPath, configFile);
    const lowerConfig = configFile.toLowerCase();
    
    try {
      if (lowerConfig === 'package.json') {
        stats.packageManager = 'npm';
        const content = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        
        // Dependencies
        if (content.dependencies) {
          stats.dependencies.push(...Object.keys(content.dependencies));
        }
        if (content.devDependencies) {
          stats.devDependencies.push(...Object.keys(content.devDependencies));
        }

        // Framework Detection
        const allDeps = [...stats.dependencies, ...stats.devDependencies];
        if (allDeps.includes('react')) stats.frameworks.push('React');
        if (allDeps.includes('vue')) stats.frameworks.push('Vue');
        if (allDeps.includes('@angular/core')) stats.frameworks.push('Angular');
        if (allDeps.includes('next')) stats.frameworks.push('Next.js');
        if (allDeps.includes('nuxt')) stats.frameworks.push('Nuxt.js');
        if (allDeps.includes('express')) stats.frameworks.push('Express');
        if (allDeps.includes('svelte')) stats.frameworks.push('Svelte');
        if (allDeps.includes('electron')) stats.frameworks.push('Electron');
      }
      
      else if (lowerConfig === 'cargo.toml') {
        stats.packageManager = 'Cargo';
        const content = fs.readFileSync(fullPath, 'utf8');
        // Simple regex parse for Cargo
        const depSection = content.split('[dependencies]');
        if (depSection.length > 1) {
          const lines = depSection[1].split('[')[0].split('\n');
          for (let line of lines) {
            line = line.trim();
            if (line && !line.startsWith('#') && line.includes('=')) {
              const depName = line.split('=')[0].trim();
              stats.dependencies.push(depName);
            }
          }
        }
        stats.frameworks.push('Rust Cargo');
      }

      else if (lowerConfig === 'pyproject.toml') {
        stats.packageManager = 'Poetry/Pipenv';
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('django') || content.includes('Django')) stats.frameworks.push('Django');
        if (content.includes('flask') || content.includes('Flask')) stats.frameworks.push('Flask');
        if (content.includes('fastapi') || content.includes('FastAPI')) stats.frameworks.push('FastAPI');
      }

      else if (lowerConfig === 'requirements.txt') {
        stats.packageManager = 'pip';
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');
        for (let line of lines) {
          line = line.trim();
          if (line && !line.startsWith('#')) {
            const depName = line.split('==')[0].split('>=')[0].trim();
            stats.dependencies.push(depName);
            
            // Check framework from requirements
            const lowerDep = depName.toLowerCase();
            if (lowerDep === 'django') stats.frameworks.push('Django');
            if (lowerDep === 'flask') stats.frameworks.push('Flask');
            if (lowerDep === 'fastapi') stats.frameworks.push('FastAPI');
          }
        }
      }

      else if (lowerConfig === 'go.mod') {
        stats.packageManager = 'Go Modules';
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');
        for (let line of lines) {
          line = line.trim();
          if (line.startsWith('require')) {
            const depName = line.replace('require', '').trim().split(' ')[0];
            if (depName && depName !== '(') {
              stats.dependencies.push(depName);
            }
          }
        }
        if (content.includes('github.com/gin-gonic/gin')) stats.frameworks.push('Gin');
        if (content.includes('github.com/astaxie/beego')) stats.frameworks.push('Beego');
      }

      else if (lowerConfig === 'composer.json') {
        stats.packageManager = 'Composer';
        const content = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        if (content.require) {
          stats.dependencies.push(...Object.keys(content.require));
        }
        const allDeps = stats.dependencies;
        if (allDeps.some(d => d.includes('laravel'))) stats.frameworks.push('Laravel');
        if (allDeps.some(d => d.includes('symfony'))) stats.frameworks.push('Symfony');
      }

      else if (lowerConfig === 'pom.xml' || lowerConfig === 'build.gradle') {
        stats.packageManager = lowerConfig === 'pom.xml' ? 'Maven' : 'Gradle';
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('spring-boot') || content.includes('springboot')) {
          stats.frameworks.push('Spring Boot');
        }
      }

      else if (lowerConfig.endsWith('.csproj') || lowerConfig === 'csproj') {
        stats.packageManager = 'NuGet';
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('Microsoft.NET.Sdk')) {
          stats.frameworks.push('.NET');
        }
      }
    } catch (e) {
      console.error('Failed to parse config file:', configFile, e);
    }
  }

  // Guess primary programming language
  let primaryLang = 'Unknown';
  let maxLoc = -1;
  const sortedLanguages = [];
  for (const [lang, data] of Object.entries(stats.languages)) {
    sortedLanguages.push({ name: lang, ...data });
    if (data.loc > maxLoc) {
      maxLoc = data.loc;
      primaryLang = lang;
    }
  }
  // Sort languages by LOC
  sortedLanguages.sort((a, b) => b.loc - a.loc);
  stats.primaryLanguage = primaryLang;
  stats.sortedLanguages = sortedLanguages;

  // If no framework detected, guess from languages
  if (stats.frameworks.length === 0) {
    if (primaryLang === 'Python') {
      // Check if we can find python frameworks
      if (stats.dependencies.includes('django')) stats.frameworks.push('Django');
      else if (stats.dependencies.includes('flask')) stats.frameworks.push('Flask');
      else if (stats.dependencies.includes('fastapi')) stats.frameworks.push('FastAPI');
      else stats.frameworks.push('Python Script/Library');
    } else if (primaryLang === 'Rust') {
      stats.frameworks.push('Rust Library/Binary');
    } else if (primaryLang === 'Go') {
      stats.frameworks.push('Go Binary');
    } else if (primaryLang === 'C#') {
      stats.frameworks.push('.NET / C#');
    } else if (primaryLang === 'JavaScript' || primaryLang === 'TypeScript') {
      stats.frameworks.push('Vanilla Node.js');
    }
  }

  // Detect Entry Point
  const possibleEntries = [
    'index.js', 'main.py', 'src/index.js', 'src/main.rs', 'src/main.ts',
    'app.js', 'index.ts', 'main.go', 'app.py', 'src/App.tsx', 'src/App.jsx',
    'Program.cs'
  ];
  for (const entry of possibleEntries) {
    if (fs.existsSync(path.join(projectPath, entry))) {
      stats.entryPoint = entry;
      break;
    }
  }
  if (!stats.entryPoint) {
    // Look for any file with name main or index in root or src/
    try {
      const rootFiles = fs.readdirSync(projectPath);
      const found = rootFiles.find(f => f.toLowerCase().startsWith('index.') || f.toLowerCase().startsWith('main.'));
      if (found) {
        stats.entryPoint = found;
      } else if (fs.existsSync(path.join(projectPath, 'src'))) {
        const srcFiles = fs.readdirSync(path.join(projectPath, 'src'));
        const srcFound = srcFiles.find(f => f.toLowerCase().startsWith('index.') || f.toLowerCase().startsWith('main.') || f.toLowerCase().startsWith('app.'));
        if (srcFound) stats.entryPoint = path.join('src', srcFound);
      }
    } catch (e) {}
  }
  if (!stats.entryPoint) stats.entryPoint = 'Not detected';

  // Estimate Complexity
  // Formula: Low: < 20 files & < 2000 LOC, Medium: < 150 files & < 15000 LOC, High: else
  if (stats.totalFiles > 150 || stats.totalLinesOfCode > 15000) {
    stats.complexity = 'High';
  } else if (stats.totalFiles > 20 || stats.totalLinesOfCode > 2000) {
    stats.complexity = 'Medium';
  } else {
    stats.complexity = 'Low';
  }

  // Generate Mermaid Architecture Diagram code
  // We'll create a dynamic top-level block diagram based on detected features
  let diagram = 'graph TD\n';
  diagram += '  User([User/Client]) --> UI[Frontend / UI]\n';
  
  if (stats.frameworks.includes('Next.js') || stats.frameworks.includes('Nuxt.js')) {
    diagram += '  UI --> Server[Next.js Server Side Routing]\n';
    diagram += '  Server --> Controllers[APIs & Serverless Functions]\n';
    if (stats.dependencies.some(d => d.includes('prisma') || d.includes('mongoose') || d.includes('sequelize'))) {
      diagram += '  Controllers --> DB[(Database)]\n';
    }
  } else if (stats.frameworks.includes('React') || stats.frameworks.includes('Vue') || stats.frameworks.includes('Angular') || stats.frameworks.includes('Svelte')) {
    diagram += '  UI --> Components[Component Tree]\n';
    if (stats.dependencies.includes('redux') || stats.dependencies.includes('pinia') || stats.dependencies.includes('vuex') || stats.dependencies.includes('mobx')) {
      diagram += '  Components --> State[State Manager]\n';
    }
    if (stats.dependencies.includes('axios') || stats.dependencies.includes('graphql')) {
      diagram += '  Components --> API[API Service]\n';
    }
  } else if (stats.frameworks.includes('Express') || stats.frameworks.includes('Django') || stats.frameworks.includes('Flask') || stats.frameworks.includes('FastAPI') || stats.frameworks.includes('Laravel') || stats.frameworks.includes('Spring Boot') || stats.frameworks.includes('Gin')) {
    diagram += '  User --> Routing[Router / Controller]\n';
    diagram += '  Routing --> Logic[Business Logic / Services]\n';
    diagram += '  Logic --> DB[(Database / Storage)]\n';
  } else {
    // Simple script diagram
    diagram += `  UI --> Entry[Entry Point: ${stats.entryPoint}]\n`;
    diagram += '  Entry --> Modules[Helper Modules / Libs]\n';
  }

  if (stats.hasDocker) {
    diagram += '  subgraph Docker Environment\n';
    diagram += '    UI\n';
    diagram += '  end\n';
  }
  
  stats.architectureDiagram = diagram;

  return stats;
}

module.exports = { scanProject };
