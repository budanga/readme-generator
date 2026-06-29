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

// Primary programming language extensions we want to prioritize reading for logic context
const PRIMARY_CODE_EXTENSIONS = new Set([
  '.js', '.jsx', '.ts', '.tsx', '.py', '.java', '.cpp', '.c', '.cs', '.go', '.rs', '.rb', '.php', '.swift', '.kt', '.dart', '.scala', '.groovy'
]);

const SENSITIVE_PATTERNS = [
  /\.env($|\.)/i, /secret/i, /credential/i, /password/i,
  /private[_-]?key/i, /\.pem$/i, /\.p12$/i, /id_rsa/i,
  /\.pfx$/i, /auth.*config/i
];

// Check if file is a code/text file we care to count LOC for
function isCodeFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return ext in EXTENSION_MAP;
}

// Sniff first 512 bytes for null byte to detect binary files
async function isBinaryFile(filePath) {
  let fileHandle;
  try {
    fileHandle = await fs.promises.open(filePath, 'r');
    const buf = Buffer.alloc(512);
    const { bytesRead } = await fileHandle.read(buf, 0, 512, 0);
    for (let i = 0; i < bytesRead; i++) {
      if (buf[i] === 0) return true;
    }
  } catch (e) {
    return true; // Treat as binary if unreadable
  } finally {
    if (fileHandle) {
      await fileHandle.close();
    }
  }
  return false;
}

// Heuristic check for minified content
function isMinifiedContent(content) {
  const lines = content.split(/\r?\n/);
  // Check first 5 lines
  for (let i = 0; i < Math.min(lines.length, 5); i++) {
    if (lines[i].length > 500) return true;
  }
  return false;
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
async function scanProject(projectPath, onProgress, signal) {
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
    architectureDiagram: '',
    screenshots: [],
    logos: []
  };

  const OBVIOUS_FILES_TO_OMIT = new Set([
    '.gitignore',
    'readme.md',
    'readme.txt',
    'readme',
    '.gitattributes',
    '.ds_store',
    'package-lock.json',
    'yarn.lock',
    'pnpm-lock.yaml',
    'cargo.lock',
    'gemfile.lock',
    'go.sum',
    '.env',
    '.env.local',
    '.env.development',
    '.env.test',
    '.env.production'
  ]);

  // Read gitignore rules
  const gitignorePath = path.join(projectPath, '.gitignore');
  let gitignoreRules = [];
  if (fs.existsSync(gitignorePath)) {
    try {
      gitignoreRules = fs.readFileSync(gitignorePath, 'utf8')
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));
    } catch (e) {
      console.error('Error reading gitignore:', e);
    }
  }

  // Precompile gitignore rules for performance and correctness
  const precompiledGitignoreRules = gitignoreRules.map(rule => {
    try {
      let cleanRule = rule;
      let matchDirOnly = false;
      if (cleanRule.endsWith('/')) {
        cleanRule = cleanRule.slice(0, -1);
        matchDirOnly = true;
      }
      
      let regexStr = cleanRule
        .replace(/[-\/\\^$+?.()|[\]{}]/g, '\\$&') // escape regex characters except *
        .replace(/\\\*/g, '.*')
        .replace(/\\\?/g, '.');
        
      if (cleanRule.startsWith('/')) {
        regexStr = '^' + regexStr.slice(2);
      } else {
        regexStr = '(^|\\/)' + regexStr;
      }
      
      regexStr += '(\\/|$)';
      
      const regex = new RegExp(regexStr);
      return { rule, regex, matchDirOnly };
    } catch (e) {
      return null;
    }
  }).filter(Boolean);

  function isPathIgnored(absolutePath, isDir = false) {
    const relativePath = path.relative(projectPath, absolutePath).replace(/\\/g, '/');
    if (!relativePath) return false;
    
    for (const rule of precompiledGitignoreRules) {
      if (rule.matchDirOnly && !isDir) continue;
      if (rule.regex.test(relativePath)) {
        return true;
      }
    }
    return false;
  }

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
  const candidateFiles = [];
  const visitedPaths = new Set();
  
  // Tree building helper (Async)
  async function buildTree(dirPath, depth = 0) {
    if (signal && signal.aborted) {
      const err = new Error('Scan aborted');
      err.name = 'AbortError';
      throw err;
    }
    if (depth > 3) return null; // limit depth to 3 for projectTree
    
    let items;
    try {
      items = await fs.promises.readdir(dirPath);
    } catch (e) {
      return null;
    }

    const nodes = [];
    for (const item of items) {
      if (IGNORED_FOLDERS.has(item)) continue;
      const fullPath = path.join(dirPath, item);
      
      // Gitignore check
      if (isPathIgnored(fullPath, true)) continue;

      // Omit obvious configuration/meta files from the tree
      if (OBVIOUS_FILES_TO_OMIT.has(item.toLowerCase())) continue;

      let isDir = false;
      let stat;
      try {
        stat = await fs.promises.lstat(fullPath);
        if (stat.isSymbolicLink()) {
          const realPath = await fs.promises.realpath(fullPath);
          if (visitedPaths.has(realPath)) continue;
          stat = await fs.promises.stat(fullPath);
        }
        isDir = stat.isDirectory();
      } catch (e) {
        continue;
      }

      if (isDir) {
        const children = await buildTree(fullPath, depth + 1);
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
    children: await buildTree(projectPath, 0)
  };

  // Recursive folder scanner (Async, Non-Blocking)
  async function walkDir(dirPath, depth = 0) {
    if (signal && signal.aborted) {
      const err = new Error('Scan aborted');
      err.name = 'AbortError';
      throw err;
    }

    if (depth > 25) return; // Prevent stack overflow on extremely deep structures

    let items;
    try {
      items = await fs.promises.readdir(dirPath);
    } catch (e) {
      return;
    }

    // Yield control to Node event loop
    await new Promise(resolve => setImmediate(resolve));

    for (const item of items) {
      if (signal && signal.aborted) {
        const err = new Error('Scan aborted');
        err.name = 'AbortError';
        throw err;
      }

      if (IGNORED_FOLDERS.has(item)) continue;
      const fullPath = path.join(dirPath, item);
      let stat;
      try {
        stat = await fs.promises.lstat(fullPath);
      } catch (e) {
        continue;
      }

      // Cycle & Symlink Protection
      if (stat.isSymbolicLink()) {
        try {
          const realPath = await fs.promises.realpath(fullPath);
          if (visitedPaths.has(realPath)) continue;
          visitedPaths.add(realPath);
          stat = await fs.promises.stat(fullPath);
        } catch (e) {
          continue; // broken symlink
        }
      }

      if (stat.isDirectory()) {
        // Gitignore check for directory
        if (isPathIgnored(fullPath, true)) continue;

        // Look for CI/CD directories
        if (item === '.github' && fs.existsSync(path.join(fullPath, 'workflows'))) {
          stats.ciCd.push('GitHub Actions');
        } else if (item === '.gitlab' && fs.existsSync(path.join(fullPath, 'workflows'))) {
          stats.ciCd.push('GitLab CI');
        }
        
        // Walk subdirectory
        await walkDir(fullPath, depth + 1);
      } else {
        const isIgnoredFile = isPathIgnored(fullPath, false);
        const ext = path.extname(item).toLowerCase();
        const relPath = path.relative(projectPath, fullPath);
        
        // Detect Config Files (store full relative path)
        const lowerItem = item.toLowerCase();
        if ([
          'package.json', 'pyproject.toml', 'requirements.txt', 'cargo.toml',
          'go.mod', 'pom.xml', 'build.gradle', 'composer.json', 'csproj'
        ].some(config => lowerItem.endsWith(config)) || ext === '.csproj') {
          stats.configFiles.push(relPath);
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
            const licContent = (await fs.promises.readFile(fullPath, 'utf8')).substring(0, 1000);
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

        // Only count tracked/non-ignored files for statistics and LOC!
        if (isIgnoredFile) continue;

        // Detect screenshots and logo/icon images
        const imageExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.svg', '.gif', '.ico'];
        if (imageExtensions.includes(ext)) {
          const lowerItem = item.toLowerCase();
          const lowerRelPath = relPath.toLowerCase().replace(/\\/g, '/');
          
          const isScreenshot = (
            lowerItem.includes('screenshot') ||
            lowerItem.includes('screen-shot') ||
            lowerItem.includes('capture') ||
            lowerRelPath.includes('/screenshots/') ||
            lowerRelPath.startsWith('screenshots/')
          );
          
          const isIconOrLogo = (
            lowerItem.includes('logo') ||
            lowerItem.includes('icon') ||
            lowerItem.includes('brand') ||
            lowerItem.includes('avatar')
          ) && !isScreenshot;

          if (isScreenshot) {
            stats.screenshots.push(relPath.replace(/\\/g, '/'));
          } else if (isIconOrLogo) {
            stats.logos.push(relPath.replace(/\\/g, '/'));
          }
        }

        // Docs files
        if (ext === '.md' && item !== 'README.md' && !IGNORED_FOLDERS.has(path.basename(dirPath))) {
          stats.docFiles.push({
            name: item,
            path: relPath
          });
        }

        // Check if test file
        const isTestFile = (
          lowerItem.includes('test') || 
          lowerItem.includes('spec') || 
          dirPath.includes('test') || 
          dirPath.includes('tests') || 
          dirPath.includes('__tests__')
        );

        if (isTestFile && isCodeFile(fullPath)) {
          stats.hasTests = true;
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

        // Language & LOC calculation (avoid binary sniffing unless it matches extensions)
        const isBinary = await isBinaryFile(fullPath);
        if (isCodeFile(fullPath) && !isBinary) {
          const lang = EXTENSION_MAP[ext] || 'Unknown';
          let loc = 0;
          let content = '';
          
          try {
            // Read file only if under 2MB for LOC count
            if (stat.size < 2 * 1024 * 1024) {
              content = await fs.promises.readFile(fullPath, 'utf8');
              loc = content.split('\n').length;
            }
          } catch (e) {
            // Unreadable / error
          }

          if (!stats.languages[lang]) {
            stats.languages[lang] = { count: 0, loc: 0 };
          }
          stats.languages[lang].count++;
          stats.languages[lang].loc += loc;
          stats.totalLinesOfCode += loc;

          stats.totalFiles++;
          if (onProgress && (stats.totalFiles % 10 === 0 || stats.totalFiles === 1)) {
            onProgress({ file: relPath, count: stats.totalFiles });
          }

          fileList.push({
            path: relPath,
            size: stat.size,
            loc: loc
          });

          const lowerRelPath = relPath.toLowerCase().replace(/\\/g, '/');
          
          const isAssetPath = (
            lowerRelPath.includes('/res/drawable') ||
            lowerRelPath.startsWith('res/drawable') ||
            lowerRelPath.includes('/res/mipmap') ||
            lowerRelPath.startsWith('res/mipmap') ||
            lowerRelPath.includes('/res/color') ||
            lowerRelPath.startsWith('res/color') ||
            lowerRelPath.includes('/assets/') ||
            lowerRelPath.startsWith('assets/') ||
            lowerRelPath.includes('/public/') ||
            lowerRelPath.startsWith('public/')
          );

          // Skip lockfiles, license files, env files, sensitive files, readmes, and assets
          const isSensitive = SENSITIVE_PATTERNS.some(p => p.test(item) || p.test(relPath));
          const isSkipContent = (
            lowerItem === 'package-lock.json' ||
            lowerItem === 'yarn.lock' ||
            lowerItem === 'pnpm-lock.yaml' ||
            lowerItem === 'cargo.lock' ||
            lowerItem === 'composer.lock' ||
            lowerItem === 'gemfile.lock' ||
            lowerItem === 'go.sum' ||
            lowerItem === 'readme.md' ||
            lowerItem.startsWith('.env') ||
            lowerItem.startsWith('license') ||
            isAssetPath ||
            isSensitive
          );

          const isMinified = isMinifiedContent(content);

          if (!isTestFile && !isSkipContent && !isMinified) {
            const relativeDir = path.relative(projectPath, dirPath);
            const depth = relativeDir ? relativeDir.split(path.sep).filter(Boolean).length : 0;
            candidateFiles.push({
              path: relPath,
              fullPath: fullPath,
              size: stat.size,
              loc: loc,
              depth: depth
            });
          }
        }
      }
    }
  }

  await walkDir(projectPath);

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
      if (lowerConfig.endsWith('package.json')) {
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
      
      else if (lowerConfig.endsWith('cargo.toml')) {
        stats.packageManager = 'Cargo';
        const content = fs.readFileSync(fullPath, 'utf8');
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

      else if (lowerConfig.endsWith('pyproject.toml')) {
        stats.packageManager = 'Poetry/Pipenv';
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('django') || content.includes('Django')) stats.frameworks.push('Django');
        if (content.includes('flask') || content.includes('Flask')) stats.frameworks.push('Flask');
        if (content.includes('fastapi') || content.includes('FastAPI')) stats.frameworks.push('FastAPI');
      }

      else if (lowerConfig.endsWith('requirements.txt')) {
        stats.packageManager = 'pip';
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');
        for (let line of lines) {
          line = line.trim();
          if (line && !line.startsWith('#')) {
            const depName = line.split('==')[0].split('>=')[0].trim();
            stats.dependencies.push(depName);
            
            const lowerDep = depName.toLowerCase();
            if (lowerDep === 'django') stats.frameworks.push('Django');
            if (lowerDep === 'flask') stats.frameworks.push('Flask');
            if (lowerDep === 'fastapi') stats.frameworks.push('FastAPI');
          }
        }
      }

      else if (lowerConfig.endsWith('go.mod')) {
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

      else if (lowerConfig.endsWith('composer.json')) {
        stats.packageManager = 'Composer';
        const content = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        if (content.require) {
          stats.dependencies.push(...Object.keys(content.require));
        }
        const allDeps = stats.dependencies;
        if (allDeps.some(d => d.includes('laravel'))) stats.frameworks.push('Laravel');
        if (allDeps.some(d => d.includes('symfony'))) stats.frameworks.push('Symfony');
      }

      else if (lowerConfig.endsWith('pom.xml') || lowerConfig.endsWith('build.gradle')) {
        stats.packageManager = lowerConfig.endsWith('pom.xml') ? 'Maven' : 'Gradle';
        const content = fs.readFileSync(fullPath, 'utf8');
        if (content.includes('spring-boot') || content.includes('springboot')) {
          stats.frameworks.push('Spring Boot');
        }
      }

      else if (lowerConfig.endsWith('.csproj') || lowerConfig.endsWith('csproj')) {
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
  if (stats.totalFiles > 150 || stats.totalLinesOfCode > 15000) {
    stats.complexity = 'High';
  } else if (stats.totalFiles > 20 || stats.totalLinesOfCode > 2000) {
    stats.complexity = 'Medium';
  } else {
    stats.complexity = 'Low';
  }

  // Generate Mermaid Architecture Diagram code
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
    diagram += `  UI --> Entry[Entry Point: ${stats.entryPoint}]\n`;
    diagram += '  Entry --> Modules[Helper Modules / Libs]\n';
  }

  if (stats.hasDocker) {
    diagram += '  subgraph Docker Environment\n';
    diagram += '    UI\n';
    diagram += '  end\n';
  }
  
  stats.architectureDiagram = diagram;

  // Extract key file contents for richer LLM context
  stats.keyFiles = [];
  const normalizedEntryPoint = stats.entryPoint !== 'Not detected' ? path.normalize(stats.entryPoint).replace(/\\/g, '/') : null;

  for (const file of candidateFiles) {
    const normalizedPath = file.path.replace(/\\/g, '/');
    file.isEntryPoint = !!(normalizedEntryPoint && normalizedPath === normalizedEntryPoint);
  }

  candidateFiles.sort((a, b) => {
    if (a.isEntryPoint && !b.isEntryPoint) return -1;
    if (!a.isEntryPoint && b.isEntryPoint) return 1;

    const extA = path.extname(a.path).toLowerCase();
    const extB = path.extname(b.path).toLowerCase();
    const aIsPrimary = PRIMARY_CODE_EXTENSIONS.has(extA);
    const bIsPrimary = PRIMARY_CODE_EXTENSIONS.has(extB);
    if (aIsPrimary && !bIsPrimary) return -1;
    if (!aIsPrimary && bIsPrimary) return 1;
    
    const coreDirs = ['src/', 'lib/', 'app/', 'core/', 'components/'];
    const aPath = a.path.replace(/\\/g, '/').toLowerCase();
    const bPath = b.path.replace(/\\/g, '/').toLowerCase();
    
    const aInCore = coreDirs.some(dir => aPath.startsWith(dir));
    const bInCore = coreDirs.some(dir => bPath.startsWith(dir));
    if (aInCore && !bInCore) return -1;
    if (!aInCore && bInCore) return 1;

    const isConfigPattern = (p) => {
      const name = path.basename(p);
      return name.includes('config.') || 
             name.includes('setup.') || 
             name.startsWith('.') ||
             name.includes('test') || 
             name.includes('spec') ||
             ['gulpfile.js', 'gruntfile.js', 'postcss.js'].some(c => name.includes(c));
    };
    const aIsConfig = isConfigPattern(aPath);
    const bIsConfig = isConfigPattern(bPath);
    if (aIsConfig && !bIsConfig) return 1;
    if (!aIsConfig && bIsConfig) return -1;

    if (a.depth !== b.depth) {
      return a.depth - b.depth;
    }
    
    return b.size - a.size;
  });

  const dirGroups = new Map();
  for (const file of candidateFiles) {
    const dir = path.dirname(file.path).replace(/\\/g, '/');
    if (!dirGroups.has(dir)) {
      dirGroups.set(dir, []);
    }
    dirGroups.get(dir).push(file);
  }

  const diverseCandidates = [];
  const groupIterators = Array.from(dirGroups.values());
  let hasMore = true;
  let cycleIdx = 0;
  
  while (hasMore && diverseCandidates.length < candidateFiles.length) {
    hasMore = false;
    for (const group of groupIterators) {
      if (cycleIdx < group.length) {
        diverseCandidates.push(group[cycleIdx]);
        hasMore = true;
      }
    }
    cycleIdx++;
  }

  const MAX_KEY_FILES = 6;
  const MAX_FILE_CHARS = 15000;
  const TOTAL_CHAR_BUDGET = 80000;
  
  let totalCharsRead = 0;
  let filesReadCount = 0;

  for (const file of diverseCandidates) {
    if (filesReadCount >= MAX_KEY_FILES || totalCharsRead >= TOTAL_CHAR_BUDGET) {
      break;
    }

    try {
      if (fs.existsSync(file.fullPath)) {
        let content = fs.readFileSync(file.fullPath, 'utf8');
        let isTruncated = false;

        if (content.length > MAX_FILE_CHARS) {
          content = content.substring(0, MAX_FILE_CHARS);
          isTruncated = true;
        }

        if (file.isEntryPoint || totalCharsRead + content.length <= TOTAL_CHAR_BUDGET + 10000) {
          stats.keyFiles.push({
            path: file.path,
            content: content + (isTruncated ? '\n\n# ... [TRUNCATED FOR BREVITY] ...' : ''),
            isEntryPoint: file.isEntryPoint
          });
          totalCharsRead += content.length;
          filesReadCount++;
        }
      }
    } catch (e) {
      console.error(`Failed to read candidate file content: ${file.path}`, e);
    }
  }

  if (onProgress) {
    onProgress({ file: 'Done', count: stats.totalFiles });
  }

  return stats;
}

module.exports = { scanProject };
