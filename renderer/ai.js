// AI Integration Module for README Generator

// Helper function to handle fetch calls with timeouts
async function fetchWithTimeout(resource, options = {}) {
  const { timeout = 60000, ...fetchOptions } = options;
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  try {
    const response = await fetch(resource, {
      ...fetchOptions,
      signal: controller.signal
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    throw error;
  }
}

// Fallback Mock Generator to create high-quality templates offline
function generateMockReadme(stats, aiStyle = 'balanced') {
  const isConcise = aiStyle === 'concise';
  const isDetailed = aiStyle === 'detailed';

  const sections = [
    {
      id: 'title',
      title: 'Project Title & Badges',
      content: `# ${stats.projectName}\n\n` +
        `![Primary Language](https://img.shields.io/badge/language-${encodeURIComponent(stats.primaryLanguage || 'Unknown')}-blue.svg)\n` +
        (stats.licenseType !== 'None' ? `![License](https://img.shields.io/badge/license-${encodeURIComponent(stats.licenseType)}-green.svg)\n` : '') +
        `![Files](https://img.shields.io/badge/files-${stats.totalFiles}-orange.svg)\n` +
        `![Complexity](https://img.shields.io/badge/complexity-${stats.complexity}-brightgreen.svg)\n\n` +
        `*A ${isConcise ? 'minimalist' : 'professional'} software project built using ${stats.primaryLanguage || 'modern technologies'}.*`
    },
    {
      id: 'description',
      title: 'Description',
      content: `**${stats.projectName}** is a ${stats.complexity.toLowerCase()}-complexity project primarily built in **${stats.primaryLanguage}**.\n\n` +
        (isConcise
          ? `It contains ${stats.totalFiles} files with ${stats.totalLinesOfCode} lines of code.`
          : `This repository contains ${stats.totalFiles} files with a total of ${stats.totalLinesOfCode} lines of code. ` +
          (stats.frameworks.length > 0 ? `It utilizes the **${stats.frameworks.join(', ')}** framework(s).` : 'It is designed as a modular script or library.') +
          (isDetailed ? ` The project uses a modular design to keep components separated and easily testable, with automated scanning to extract statistics.` : ''))
    }
  ];

  // Key Features
  let featuresContent = `- **Automated Scanner**: Fast directory traversal and code analysis.\n` +
    `- **Framework Support**: Auto-detects dependencies and build tools.\n` +
    `- **Developer Friendly**: Easily extensible with custom sections and modules.`;
  if (!isConcise) {
    featuresContent += `\n- **Modular Architecture**: Clean separation between logic and layout.\n` +
      `- **CI/CD Integration**: Supports modern deployment workflows.`;
  }
  sections.push({
    id: 'features',
    title: 'Key Features',
    content: featuresContent
  });

  // Technologies (omit in concise mode)
  if (!isConcise) {
    let techContent = `The project leverages the following language distribution and dependencies:\n\n` +
      `### Language Breakdown\n` +
      (stats.sortedLanguages || []).map(l => `- **${l.name}**: ${l.count} files (${l.loc} lines)`).join('\n') +
      `\n\n### Core Dependencies & Package Management\n` +
      `- **Package Manager**: ${stats.packageManager}\n` +
      (stats.dependencies.length > 0 ? stats.dependencies.slice(0, 10).map(d => `- \`${d}\``).join('\n') : '- No major external dependencies detected.');
    sections.push({
      id: 'technologies',
      title: 'Technologies Used',
      content: techContent
    });
  }

  // Installation
  sections.push({
    id: 'installation',
    title: 'Installation Instructions',
    content: `To set up the project locally, follow these steps:\n\n` +
      `1. **Clone the repository**:\n` +
      `   \`\`\`bash\n` +
      `   git clone <repository-url>\n` +
      `   cd ${stats.projectName}\n` +
      `   \`\`\`\n\n` +
      `2. **Install dependencies**:\n` +
      `   ` + getInstallationCommand(stats)
  });

  // Usage
  sections.push({
    id: 'usage',
    title: 'Usage Examples',
    content: `To run or start the application:\n\n` +
      getUsageCommand(stats) +
      (isConcise ? '' : `\n\nConfigure your environment variables if needed by copying the template file:\n` +
        `\`\`\`bash\n` +
        `cp .env.example .env\n` +
        `\`\`\``)
  });

  // Folder structure & Architecture (omit in concise mode)
  if (!isConcise) {
    sections.push({
      id: 'folder_structure',
      title: 'Folder Structure',
      content: `An overview of the folder layout:\n\n` +
        `\`\`\`text\n` +
        (stats.entryPoint !== 'Not detected' ? `├── ${stats.entryPoint} (Entry point)\n` : '') +
        (stats.configFiles.map(c => `├── ${c} (Config)`).join('\n')) +
        `\n└── ...\n` +
        `\`\`\``
    });

    sections.push({
      id: 'architecture',
      title: 'Architecture Diagram',
      content: `Below is a Mermaid diagram representing the architecture layout of the project:\n\n` +
        `\`\`\`mermaid\n` +
        stats.architectureDiagram +
        `\`\`\``
    });
  }

  // Contributing (omit in concise mode)
  if (!isConcise) {
    sections.push({
      id: 'contributing',
      title: 'Contributing',
      content: `Contributions are welcome! Please follow these steps:\n\n` +
        `1. Fork the Project\n` +
        `2. Create your Feature Branch (\`git checkout -b feature/AmazingFeature\`)\n` +
        `3. Commit your Changes (\`git commit -m 'Add some AmazingFeature'\`)\n` +
        `4. Push to the Branch (\`git push origin feature/AmazingFeature\`)\n` +
        `5. Open a Pull Request`
    });
  }

  // License
  sections.push({
    id: 'license',
    title: 'License',
    content: stats.hasLicense
      ? `Distributed under the **${stats.licenseType}** License. See \`LICENSE\` for more information.`
      : `This project does not currently specify a LICENSE. All rights reserved.`
  });

  return sections;
}

function getInstallationCommand(stats) {
  if (stats.packageManager === 'npm') return `\`\`\`bash\nnpm install\n\`\`\``;
  if (stats.packageManager === 'Cargo') return `\`\`\`bash\ncargo build\n\`\`\``;
  if (stats.packageManager === 'pip') return `\`\`\`bash\npip install -r requirements.txt\n\`\`\``;
  if (stats.packageManager === 'Poetry/Pipenv') return `\`\`\`bash\npoetry install\n\`\`\``;
  if (stats.packageManager === 'Go Modules') return `\`\`\`bash\ngo mod download\n\`\`\``;
  if (stats.packageManager === 'Composer') return `\`\`\`bash\ncomposer install\n\`\`\``;
  return `\`\`\`bash\n# Standard setup command\n\`\`\``;
}

function getUsageCommand(stats) {
  if (stats.packageManager === 'npm') return `\`\`\`bash\nnpm start\n# or\nnpm run dev\n\`\`\``;
  if (stats.packageManager === 'Cargo') return `\`\`\`bash\ncargo run\n\`\`\``;
  if (stats.packageManager === 'pip' || stats.packageManager === 'Poetry/Pipenv') {
    return `\`\`\`bash\npython ${stats.entryPoint !== 'Not detected' ? stats.entryPoint : 'main.py'}\n\`\`\``;
  }
  if (stats.packageManager === 'Go Modules') return `\`\`\`bash\ngo run .\n\`\`\``;
  return `\`\`\`bash\n# Run command\n\`\`\``;
}

function formatProjectTree(node, prefix = "") {
  if (!node) return "";
  let result = "";
  if (node.children && node.children.length > 0) {
    node.children.forEach((child, index) => {
      const isLast = index === node.children.length - 1;
      const marker = isLast ? "└── " : "├── ";
      result += `${prefix}${marker}${child.name}${child.type === 'directory' ? '/' : ''}\n`;
      if (child.type === 'directory' && child.children) {
        const nextPrefix = prefix + (isLast ? "    " : "│   ");
        result += formatProjectTree(child, nextPrefix);
      }
    });
  }
  return result;
}

// Main AI Generation Request Function
// Main AI Generation Request Function
async function generateAIExtractedReadme(stats, options) {
  if (options.provider === 'gemini' && !options.apiKey) {
    console.log(`No API key provided, returning Mock generated sections with style: ${options.style}.`);
    return generateMockReadme(stats, options.style);
  }
  if (options.provider === 'claude' && !options.claudeKey) {
    alert('An Anthropic API Key is required. Please add it in Settings.');
    return null;
  }
  if (options.provider === 'openai' && !options.openaiKey) {
    alert('An OpenAI API Key is required. Please add it in Settings.');
    return null;
  }

  const statusTitle = document.getElementById('generation-status-title');
  const statusDesc = document.getElementById('generation-status-desc');
  const updateProgress = (title, desc) => {
    if (statusTitle) statusTitle.textContent = title;
    if (statusDesc) statusDesc.textContent = desc;
  };

  updateProgress('Preparing Codebase Context...', 'Analyzing project files and packaging key contents.');

  // Set up generation progress listener from main process
  const removeListener = window.api.onGenerationProgress((data) => {
    updateProgress(data.title, data.desc);
  });

  try {
    const response = await window.api.generateReadme({ stats, options });
    removeListener();

    if (response.aborted) {
      return null;
    }

    if (!response.success) {
      throw new Error(response.error);
    }

    updateProgress('Parsing generated sections...', 'Structuring markdown content into editor sections.');

    let resultText = response.resultText;

    const sections = parseAndExtractSections(resultText);

    // Validate result: reject if the model returned garbage (e.g. a single file
    // reference, a minimal object, or sections with entirely empty content).
    const sectionsWithContent = sections ? sections.filter(s => s.content && s.content.trim().length > 30) : [];
    if (!sections || sections.length < 2 || sectionsWithContent.length < 2) {
      throw new Error(
        `The model returned an invalid or empty response. It likely ignored the required output format. ` +
        `Raw response (first 200 chars): ${resultText.slice(0, 200)}`
      );
    }

    return sections;

  } catch (error) {
    removeListener();
    console.error('AI Generation call failed, falling back to mock generator:', error);
    if (window.showCustomErrorModal) {
      window.showCustomErrorModal(
        'AI Generation Failed (Offline Fallback)',
        `AI Generation failed: ${error.message}. Falling back to Offline Template Mode.`,
        error
      );
    } else {
      alert(`AI Generation failed (${error.message}). Falling back to Offline Template Mode.`);
    }
    return generateMockReadme(stats);
  }
}


// Single section AI regeneration
async function regenerateAISection(sectionId, sectionTitle, currentContent, stats, instructions, options) {
  if (options.provider === 'gemini' && !options.apiKey) {
    alert('A Gemini API Key is required to regenerate sections with AI.');
    return currentContent;
  }

  try {
    const response = await window.api.regenerateSection({
      sectionId,
      sectionTitle,
      currentContent,
      stats,
      instructions,
      options
    });
    
    if (!response.success) {
      throw new Error(response.error);
    }
    return response.resultText;
  } catch (error) {
    console.error('Failed to regenerate section:', error);
    alert(`Failed to regenerate section: ${error.message}`);
    return currentContent;
  }
}

function extractJsonFromString(str) {
  const jsonStart = str.indexOf('[');
  const jsonEnd = str.lastIndexOf(']');
  if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
    return str.substring(jsonStart, jsonEnd + 1);
  }
  return null;
}

function parseAndExtractSections(resultText) {
  console.log("Raw AI response to parse:", resultText);
  let cleaned = resultText.trim();

  // Strip <think>...</think> blocks produced by reasoning models (e.g. Qwen3, DeepSeek-R1).
  // These appear before the actual output and would break all parse attempts.
  cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

  // Guard: if the response is empty (e.g. model exhausted token budget on thinking),
  // fail fast with a clear message instead of falling through all parse attempts.
  if (!cleaned) {
    throw new Error(
      'The model returned an empty response. ' +
      'If using a reasoning model (Qwen3, DeepSeek-R1, etc.), it may have spent all available tokens on internal thinking. ' +
      'Try a smaller project, reduce context in Settings, or use a non-reasoning model variant.'
    );
  }

  // Strip outer markdown fences if the model wrapped its response
  cleaned = cleaned.replace(/^```(?:json|markdown)?\s*/i, '').replace(/\s*```$/i, '').trim();

  // Detect Markdown by searching for a # or ## heading at the start of any line.
  // JSON always uses escaped \n inside strings, so real line-start headings only appear
  // in Markdown output — no false positives from ## inside JSON content fields.
  const firstHeadingIndex = cleaned.search(/^#{1,2}\s+\S/m);
  const isMarkdown = firstHeadingIndex !== -1;

  // If the model added preamble text before the first heading, strip it.
  if (isMarkdown && firstHeadingIndex > 0) {
    cleaned = cleaned.slice(firstHeadingIndex).trim();
  }

  if (!isMarkdown) {
    // Pre-process 1: Convert raw backtick code blocks in "content" fields to valid JSON strings.
    // The model sometimes writes:  "content": ```mermaid\n...```
    // instead of:                  "content": "```mermaid\\n...```"
    cleaned = cleaned.replace(/"content"\s*:\s*`{3}([\s\S]*?)(`{3}|$)/g, (match, inner) => {
      const escaped = inner
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\r?\n/g, '\\n')
        .replace(/\t/g, '\\t');
      return `"content": "\`\`\`${escaped.trim()}\`\`\`"`;
    });

    // Pre-process 2: Heal truncated JSON (close open strings, brackets, braces).
    cleaned = repairTruncatedJson(cleaned);
  }

  // Helper to sanitize and heal extracted sections array
  function sanitizeSections(result) {
    if (!Array.isArray(result)) return null;
    const sanitized = result.map((section, index) => {
      console.log(`[sanitizeSections] Raw section[${index}]:`, JSON.stringify(section));

      // Handle plain string elements — the AI returned a flat list instead of objects
      if (typeof section === 'string') {
        const str = section.trim();
        // Derive a short title from the first sentence or first 60 chars
        const firstSentence = str.split(/[.!?\n]/)[0].trim();
        const title = firstSentence.length > 0 && firstSentence.length <= 80
          ? firstSentence
          : str.slice(0, 60) + (str.length > 60 ? '...' : '');
        const id = title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || `section_${index}`;
        return { id, title, content: str };
      }

      let id = section.id || section.section_id || section.key || '';
      let title = section.title || section.section_title || section.name || section.heading || section.header || section.section || '';
      let content = section.content || section.body || section.text || section.markdown || section.description || '';

      // Last-resort: scan all string-valued keys to extract id/title/content from unknown schemas
      if (!id && !title && !content && section && typeof section === 'object') {
        const stringKeys = Object.keys(section).filter(k => typeof section[k] === 'string');
        console.warn(`[sanitizeSections] Unknown section schema at index ${index}, string keys:`, stringKeys);
        if (stringKeys.length === 1) {
          // Single string key: treat key as title, value as content
          title = stringKeys[0].replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          content = section[stringKeys[0]];
        } else if (stringKeys.length >= 2) {
          // Heuristic: shortest key is likely the title/id, longest value is likely the content
          const byValueLen = [...stringKeys].sort((a, b) => section[b].length - section[a].length);
          content = section[byValueLen[0]];
          const remainingKeys = byValueLen.slice(1);
          const titleKey = remainingKeys.find(k => k.length <= 20) || remainingKeys[0];
          title = section[titleKey] || titleKey.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        }
      }

      if (!id && title) {
        id = title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
      } else if (!id) {
        id = `section_${index}`;
      }

      if (!title && id) {
        title = id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
      } else if (!title) {
        title = `Section ${index + 1}`;
      }

      let sanitizedContent = String(content);

      // Auto-heal Mermaid syntax errors generated by models (broken arrows, unquoted special chars in nodes, etc.)
      sanitizedContent = sanitizedContent.replace(/```mermaid\s*([\s\S]*?)\s*```/gi, (match, mermaidCode) => {
        return '```mermaid\n' + sanitizeMermaid(mermaidCode) + '\n```';
      });

      return {
        id: String(id),
        title: String(title),
        content: sanitizedContent
      };
    });

    // Post-process: automatically detect, extract, and merge any badge-only sections
    // to prevent the AI from generating ugly standalone badge sections
    const badgeRegex = /^(\s*!\[[^\]]*\]\([^\)]+\)\s*)+$/;
    const badgeSections = [];
    const mainSections = [];

    sanitized.forEach(sec => {
      if (!sec.content.trim()) return;
      const contentIsBadges = badgeRegex.test(sec.content.trim());
      const titleIsBadges = badgeRegex.test(sec.title.trim());

      if (contentIsBadges || (titleIsBadges && !sec.content.includes('\n'))) {
        const badgeText = sec.content.trim() || sec.title.trim();
        badgeSections.push(badgeText);
      } else {
        mainSections.push(sec);
      }
    });

    if (badgeSections.length > 0 && mainSections.length > 0) {
      // Find the best section to prepend the badges to: 'title', then 'description', or the first section
      let targetSec = mainSections.find(s => s.id === 'title') || mainSections.find(s => s.id === 'description') || mainSections[0];
      if (targetSec) {
        const badgesString = badgeSections.join(' ') + '\n\n';
        // If the target section already has a title header, try to insert badges right after it
        if (targetSec.content.startsWith('# ')) {
          const lines = targetSec.content.split('\n');
          // Find the first blank line after the header, or just insert on the second line
          let insertIndex = 1;
          for (let i = 0; i < lines.length; i++) {
            if (lines[i].trim() === '') {
              insertIndex = i;
              break;
            }
          }
          lines.splice(insertIndex, 0, badgeSections.join(' '));
          targetSec.content = lines.join('\n');
        } else {
          targetSec.content = badgesString + targetSec.content;
        }
      }
    }

    return mainSections.length > 0 ? mainSections : sanitized;
  }

  // Helper to extract array from parsed object
  function extractArray(parsedVal) {
    if (Array.isArray(parsedVal)) {
      return parsedVal;
    }
    if (parsedVal && typeof parsedVal === 'object') {
      // 0. Prioritize the expected "sections" key or common aliases
      if (Array.isArray(parsedVal.sections)) return parsedVal.sections;
      if (Array.isArray(parsedVal.readme_sections)) return parsedVal.readme_sections;
      if (Array.isArray(parsedVal.readme)) return parsedVal.readme;

      // 1. Fallback: Find the first array property, but only if it looks like README sections
      // (items should have content-like keys, not data-model keys like {name, version})
      const CONTENT_KEYS = new Set(['content', 'body', 'text', 'markdown', 'description']);
      const looksLikeSections = (arr) =>
        Array.isArray(arr) && arr.length > 0 &&
        arr.some(item => item && typeof item === 'object' &&
          Object.keys(item).some(k => CONTENT_KEYS.has(k.toLowerCase())));

      const arr = Object.values(parsedVal).find(v => Array.isArray(v) && looksLikeSections(v));
      if (arr) return arr;

      // 2. Check if it's a map/dictionary of section objects (e.g. { "title": { "id": "...", "content": "..." }, "description": { ... } })
      const keys = Object.keys(parsedVal);
      const values = Object.values(parsedVal);
      const isMapOfSections = values.length > 0 && values.every(v =>
        v && typeof v === 'object' && !Array.isArray(v) &&
        (typeof v.content === 'string' || typeof v.id === 'string' || (typeof v.title === 'string' && typeof v.content === 'string'))
      );
      if (isMapOfSections) {
        const sectionsList = [];
        for (const key of keys) {
          const sectionObj = parsedVal[key];
          if (!sectionObj.id) {
            sectionObj.id = key.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
          }
          if (!sectionObj.title) {
            sectionObj.title = key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          }
          if (!sectionObj.content) {
            sectionObj.content = '';
          }
          sectionsList.push(sectionObj);
        }
        return sectionsList;
      }

      // 3. If it's a single section object (e.g. { "id": "...", "title": "...", "content": "..." })
      if (parsedVal.content && (parsedVal.id || parsedVal.title)) {
        if (!parsedVal.id) {
          parsedVal.id = parsedVal.title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
        }
        if (!parsedVal.title) {
          parsedVal.title = parsedVal.id.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        }
        return [parsedVal];
      }

      // 4. If it's a flat key-value map of sections (e.g. { "Description": "...", "Installation": "..." })
      const stringValues = keys.filter(k => typeof parsedVal[k] === 'string');
      if (stringValues.length > 0 && stringValues.length >= keys.length * 0.8) { // 80% of values are strings
        return stringValues.map(k => ({
          id: k.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''),
          title: k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          content: parsedVal[k]
        }));
      }

      // 5. Try nested objects (depth-first search for any array or valid section map)
      for (const key of keys) {
        if (parsedVal[key] && typeof parsedVal[key] === 'object') {
          const res = extractArray(parsedVal[key]);
          if (res) return res;
        }
      }
    }
    return null;
  }

  function repairTruncatedJson(jsonStr) {
    let inString = false;
    let isEscaped = false;
    const stack = [];
    jsonStr = jsonStr.trim();
    
    for (let i = 0; i < jsonStr.length; i++) {
      const char = jsonStr[i];
      if (isEscaped) {
        isEscaped = false;
        continue;
      }
      if (char === '\\') {
        isEscaped = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (char === '{' || char === '[') {
          stack.push(char);
        } else if (char === '}') {
          if (stack[stack.length - 1] === '{') stack.pop();
        } else if (char === ']') {
          if (stack[stack.length - 1] === '[') stack.pop();
        }
      }
    }
    
    let repaired = jsonStr;
    if (inString) {
      repaired += '"';
    }
    
    while (stack.length > 0) {
      const openChar = stack.pop();
      if (openChar === '{') {
        repaired = repaired.trim();
        if (repaired.endsWith(',') || repaired.endsWith(':')) {
          repaired = repaired.slice(0, -1);
        }
        repaired += '}';
      } else if (openChar === '[') {
        repaired = repaired.trim();
        if (repaired.endsWith(',')) {
          repaired = repaired.slice(0, -1);
        }
        repaired += ']';
      }
    }
    return repaired;
  }

  // Try parsing as Markdown (used when provider is ollama/local)
  if (isMarkdown) {
    try {
      const sections = [];
      
      // Split the document by H2 headers, keeping the headers
      // We use a regex that matches ## followed by spaces and text until the end of line
      const parts = cleaned.split(/^(?=\s*##\s+.*$)/m);
      
      for (let i = 0; i < parts.length; i++) {
        let part = parts[i].trim();
        if (!part) continue;
        
        let id, title, content;
        
        if (i === 0 && !part.startsWith('##')) {
          // This is the title section (should start with #)
          id = 'title';
          title = 'Title';
          content = part;
        } else {
          // This is a regular section (starts with ##)
          const match = part.match(/^\s*##\s+(.+)$/m);
          if (match) {
            title = match[1].trim();
            id = title.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
            // Content is everything after the header line
            content = part.substring(match[0].length).trim();
          } else {
            // Fallback if parsing fails but it's in the middle of sections
            title = `Section ${i}`;
            id = `section_${i}`;
            content = part;
          }
        }
        
        sections.push({ id, title, content });
      }
      
      if (sections.length > 0) {
        return sanitizeSections(sections);
      }
    } catch (e) {
      console.warn("Markdown parsing failed, falling back to JSON parsing...", e);
    }
  }

  // 1. Try direct parse
  try {
    const parsed = JSON.parse(cleaned);
    const result = extractArray(parsed);
    if (result) return sanitizeSections(result);
  } catch (e) {
    console.warn("Direct JSON parse failed, trying repair passes...", e);
  }

  // 2. Try Repair pass (escape stray newlines/quotes inside strings)
  try {
    const repaired = cleaned.replace(
      /"content"\s*:\s*"([\s\S]*?)(?=",\s*"(?:id|title)"|}])/g,
      (match, inner) => {
        const fixed = inner
          .replace(/\\/g, '\\\\')
          .replace(/"/g, '\\"')
          .replace(/\r?\n/g, '\\n')
          .replace(/\t/g, '\\t');
        return `"content": "${fixed}`;
      }
    );
    const parsed = JSON.parse(repaired);
    const result = extractArray(parsed);

    if (result) return sanitizeSections(result);
  } catch (e) {
    console.warn("Repaired JSON parse failed...", e);
  }

  // 3. Try to extract array [...]
  const arrayStart = cleaned.indexOf('[');
  const arrayEnd = cleaned.lastIndexOf(']');
  if (arrayStart !== -1 && arrayEnd !== -1 && arrayEnd > arrayStart) {
    const arrayStr = cleaned.substring(arrayStart, arrayEnd + 1);
    try {
      const parsed = JSON.parse(arrayStr);
      if (Array.isArray(parsed)) return sanitizeSections(parsed);
    } catch (e) {
      // Try repairing the extracted array substring
      try {
        const repairedArray = arrayStr.replace(
          /"content"\s*:\s*"([\s\S]*?)(?=",\s*"(?:id|title)"|}])/g,
          (match, inner) => {
            return `"content": "${inner.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, '\\n').replace(/\t/g, '\\t')}`;
          }
        );
        const parsed = JSON.parse(repairedArray);
        if (Array.isArray(parsed)) return sanitizeSections(parsed);
      } catch (_) { }
    }
  }

  // 4. Try to extract object {...}
  const objStart = cleaned.indexOf('{');
  const objEnd = cleaned.lastIndexOf('}');
  if (objStart !== -1 && objEnd !== -1 && objEnd > objStart) {
    const objStr = cleaned.substring(objStart, objEnd + 1);
    try {
      const parsed = JSON.parse(objStr);
      const result = extractArray(parsed);
      if (result) return sanitizeSections(result);
    } catch (e) {
      // Try repairing the extracted object substring
      try {
        const repairedObj = objStr.replace(
          /"content"\s*:\s*"([\s\S]*?)(?=",\s*"(?:id|title)"|}])/g,
          (match, inner) => {
            return `"content": "${inner.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, '\\n').replace(/\t/g, '\\t')}`;
          }
        );
        const parsed = JSON.parse(repairedObj);
        const result = extractArray(parsed);
        if (result) return sanitizeSections(result);
      } catch (_) { }
    }
  }

  throw new Error("Could not parse AI response as a valid JSON array or object containing sections.");
}

// Helper to auto-heal syntax errors in Mermaid code generated by LLMs
function sanitizeMermaid(mermaidCode) {
  let lines = mermaidCode.split('\n');
  return lines.map(line => {
    // 1. Fix broken arrows and hallucinated subgroups (e.g. "-- >" to "-->", "subgroup" to "subgraph")
    line = line.replace(/--\s+>/g, '-->').replace(/--\s+>>/g, '-->>');
    line = line.replace(/^\s*subgroup\b/g, (match) => match.replace('subgroup', 'subgraph'));

    // 2. Fix unquoted text containing special characters inside brackets []
    // Match: nodeId[Text here] but NOT nodeId["Text here"]
    line = line.replace(/(\w+)(\[\s*)([^"\]\n]+)(\s*\])/g, (match, nodeId, openBracket, content, closeBracket) => {
      let clean = content.trim().replace(/"/g, ''); // strip any accidental unclosed double quotes
      if (/[()\[\]{}:\/,.\-*&%$#@!]/.test(clean)) {
        return `${nodeId}["${clean}"]`;
      }
      return `${nodeId}[${clean}]`;
    });

    // 3. Fix unquoted text containing special characters inside parentheses ()
    // Match: nodeId(Text here) but NOT nodeId("Text here") or nodeId([Text])
    // Avoid matching ([...]) which is handled separately
    if (!line.includes('([')) {
      line = line.replace(/(\w+)(\(\s*)([^"'\)\n]+)(\s*\))/g, (match, nodeId, openParen, content, closeParen) => {
        let clean = content.trim().replace(/"/g, '');
        if (/[()\[\]{}:\/,.\-*&%$#@!]/.test(clean)) {
          return `${nodeId}("${clean}")`;
        }
        return `${nodeId}(${clean})`;
      });
    }

    // 4. Fix unquoted text inside ([ ]) - stadium shape
    line = line.replace(/(\w+)\(\[\s*([^"\]\n]+)\s*\]\)/g, (match, nodeId, content) => {
      let clean = content.trim().replace(/"/g, '');
      return `${nodeId}(["${clean}"])`;
    });

    // 5. Fix unquoted text inside { } - decision shape
    line = line.replace(/(\w+)\{\s*([^"\}\n]+)\s*\}/g, (match, nodeId, content) => {
      let clean = content.trim().replace(/"/g, '');
      if (/[()\[\]{}:\/,.\-*&%$#@!]/.test(clean)) {
        return `${nodeId}{"${clean}"}`;
      }
      return `${nodeId}{${clean}}`;
    });

    return line;
  }).join('\n');
}

