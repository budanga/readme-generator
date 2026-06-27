// AI Integration Module for README Generator

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
               `*A ${isConcise ? 'minimalist' : 'premium'} software project built using ${stats.primaryLanguage || 'modern technologies'}.*`
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

// Main AI Generation Request Function
async function generateAIExtractedReadme(stats, options) {
  if (options.provider === 'gemini' && !options.apiKey) {
    console.log(`No API key provided, returning Mock generated sections with style: ${options.style}.`);
    return generateMockReadme(stats, options.style);
  }

  // Adjust prompt style instructions based on style choice
  let styleInstruction = "";
  if (options.style === 'concise') {
    styleInstruction = "Make the generated README concise, clear, and direct. Focus on key details (brief description, standard installation/run commands, main features) without unnecessary fluff or wordy explanations. Use clear bullet points and keep descriptions to-the-point, but ensure all essential context and information remains intact.";
  } else if (options.style === 'detailed') {
    styleInstruction = "Make the generated README highly detailed, comprehensive, and technical. Elaborate thoroughly on features, configuration files, directory layout, code design decisions, API sections, and future improvements. Add descriptive paragraphs and explain everything in depth.";
  } else {
    styleInstruction = "Maintain a balanced, standard, and professional level of detail (balanced style).";
  }

  // Create prompt detailing the scanned project stats
  const systemPrompt = `You are a senior software engineer writing a README.md for your own project. 
Write the documentation from the perspective of the project developer. It must read 100% naturally, as if a human engineer wrote it.

CRITICAL GUIDELINES:
1. NEVER mention that this README itself was generated by AI, and do not reference any automated scanner/detection process used to build this documentation (do not write phrases like "no license was detected" or "HTML was detected"). However, if the project itself contains AI features (for example, this project is a README Generator that uses Gemini/Ollama), feel free to document those AI features naturally as part of the project description, features, and technologies.
2. If there is no license, simply write "This project is unlicensed." or state that it is under proprietary terms. Do not say "no license was detected".
3. Write about the project's tech stack naturally. For example, if HTML is statistically the primary language due to build output/dependency files, but the core logic is in Python, write about it as a Python project without explaining the scan discrepancy.
4. Avoid meta-commentary. Focus objective language on what the project does, how to install it, and how to use it. Do not explain *why* something is in the README, just write the content directly.
5. In any generated Mermaid diagram, you MUST wrap node labels containing parentheses, brackets, colons, or other special characters in double quotes. For example, write 'UI["Frontend / UI (Jetpack Compose)"]' instead of 'UI[Frontend / UI (Jetpack Compose)]'. This is absolutely critical to avoid Mermaid parser syntax errors.
6. NEVER generate "FAQ" or "Development Notes" sections.
7. Do NOT invent, hallucinate, or assume future features, roadmap items, or specific contribution lists. If you generate a "Contributing" section, keep it completely generic (e.g., fork, create branch, push changes, submit pull request) without listing specific features, templates, or formats to improve. Do not invent specific things to contribute to.
8. In the "Technologies" (or "Built With") section, ONLY list the names of the technologies and their versions (e.g. "Python 3.12", "Django 6.0", "SQLite", "Pillow (for images)", "Bootstrap 5 (CDN)") in English. Do NOT write descriptions, paragraphs, or statistics like file counts or Lines of Code (LOC). Keep it strictly as a clean, simple list of names and versions (with brief parenthetical notes only if necessary).
9. Whenever a command is outputted, always wrap it inside a fenced markdown code block using triple backticks (i.e. \`\`\`bash ... \`\`\`). Do NOT output commands as plain text or inline code blocks.

Writing Style Instruction:
${styleInstruction}`;

  const userPrompt = `Project Name: ${stats.projectName}
Primary Language: ${stats.primaryLanguage}
Languages: ${JSON.stringify(stats.sortedLanguages ? stats.sortedLanguages.map(l => l.name) : Object.keys(stats.languages || {}))}
Total Files: ${stats.totalFiles}
Total Lines of Code (LOC): ${stats.totalLinesOfCode}
Estimated Complexity: ${stats.complexity}
Frameworks Detected: ${JSON.stringify(stats.frameworks)}
Package Manager: ${stats.packageManager}
Entry Point File: ${stats.entryPoint}
Detected License: ${stats.licenseType}
Environment Files found: ${JSON.stringify(stats.envFiles)}
Docker Support: ${stats.hasDocker ? 'Yes' : 'No'}
Git Repository: ${stats.hasGit ? 'Yes (Branch: ' + stats.gitInfo.branch + ', Commits: ' + stats.gitInfo.commits + ')' : 'No'}
CI/CD Systems: ${JSON.stringify(stats.ciCd)}
Has Tests: ${stats.hasTests ? 'Yes' : 'No'}
Configuration Files Scanned: ${JSON.stringify(stats.configFiles)}
Top 5 Largest Files: ${JSON.stringify(stats.largestFiles)}
Mermaid Architecture Diagram Draft:
\`\`\`mermaid
${stats.architectureDiagram}
\`\`\`

Based on this, you must output a JSON object containing a "sections" key, which is an array of objects representing the sections of the README.md.
Do NOT output anything else except a valid JSON object. Do not put markdown code fences around the JSON itself.
The "sections" array should contain objects, each with these exact properties:
- "id": A unique string key for the section (e.g. "title", "description", "features", "installation", "usage", "folder_structure", "technologies", "architecture", "configuration", "contributing", "license")
- "title": The header name of the section (e.g. "Description", "Key Features", "Installation Instructions")
- "content": The markdown content of the section. Important: Do NOT include the section header (like "# My Project" or "## Installation") inside the content string, because the UI renders the section title separately. Use clean, professional, and detailed markdown with proper tables, code blocks, lists, and badges where appropriate.

Make sure to infer missing information from the project details instead of fabricating/hallucinating unrelated things. Add badges for language, license, files, and build tools in the "title" or top of the "description" section.

Ensure your JSON output can be directly parsed via JSON.parse(). Double-escape any backslashes in code snippets if necessary.`;

  try {
    let resultText = '';

    if (options.provider === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${options.modelName}:generateContent?key=${options.apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt + "\n\n" + userPrompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        })
      });
      
      if (!response.ok) throw new Error(`Gemini API returned error: ${response.status} - ${await response.text()}`);
      const data = await response.json();
      resultText = data.candidates[0].content.parts[0].text.trim();
      
    } else if (options.provider === 'ollama') {
      if (!options.ollamaModel) throw new Error('No Ollama model selected.');
      const url = `${options.ollamaUrl.replace(/\/$/, '')}/api/chat`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: options.ollamaModel,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          stream: false,
          format: 'json'
        })
      });
      
      if (!response.ok) throw new Error(`Ollama API returned error: ${response.status} - ${await response.text()}`);
      const data = await response.json();
      resultText = data.message.content.trim();
    }

    // Strip markdown fences if AI wrapped the JSON in ```json ... ```
    resultText = resultText.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

    return parseAndExtractSections(resultText);
  } catch (error) {
    console.error('Gemini API call failed, falling back to mock generator:', error);
    alert(`AI Generation failed (${error.message}). Falling back to Offline Template Mode.`);
    return generateMockReadme(stats);
  }
}

// Single section AI regeneration
async function regenerateAISection(sectionId, sectionTitle, currentContent, stats, instructions, options) {
  if (options.provider === 'gemini' && !options.apiKey) {
    alert('A Gemini API Key is required to regenerate sections with AI.');
    return currentContent;
  }

  const prompt = `
You are an expert technical writer. The user wants to regenerate a specific section of their project README.md file.

Project Name: ${stats.projectName}
Primary Language: ${stats.primaryLanguage}
Frameworks Detected: ${JSON.stringify(stats.frameworks)}
Package Manager: ${stats.packageManager}

Section to update: "${sectionTitle}" (id: ${sectionId})
Current Content:
${currentContent}

User Instructions for modification:
"${instructions}"

Please rewrite this section content based on the user instructions and project context.
Do NOT include the section header (like "## ${sectionTitle}") in your output. Just output the clean markdown body of the section. Do not wrap the output in markdown code fences unless the content itself is a code block.
`;

  try {
    let resultText = '';

    if (options.provider === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${options.modelName}:generateContent?key=${options.apiKey}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });
      if (!response.ok) throw new Error(`Gemini API error: ${response.status} - ${await response.text()}`);
      const data = await response.json();
      resultText = data.candidates[0].content.parts[0].text;
      
    } else if (options.provider === 'ollama') {
      if (!options.ollamaModel) throw new Error('No Ollama model selected.');
      const url = `${options.ollamaUrl.replace(/\/$/, '')}/api/chat`;
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: options.ollamaModel,
          messages: [
            { role: 'system', content: 'You are an expert technical writer. The user wants to regenerate a specific section of their project README.md file.' },
            { role: 'user', content: prompt }
          ],
          stream: false
        })
      });
      if (!response.ok) throw new Error(`Ollama API error: ${response.status} - ${await response.text()}`);
      const data = await response.json();
      resultText = data.message.content;
    }

    return resultText.trim();
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
  
  // Strip markdown blocks if any
  cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  // Helper to extract array from parsed object
  function extractArray(parsedVal) {
    if (Array.isArray(parsedVal)) {
      return parsedVal;
    }
    if (parsedVal && typeof parsedVal === 'object') {
      // 1. Find the first array property (e.g. { "sections": [...] })
      const arr = Object.values(parsedVal).find(Array.isArray);
      if (arr) return arr;
      
      // 2. If it's a single section object (e.g. { "id": "...", "title": "...", "content": "..." })
      if (parsedVal.title && parsedVal.content) {
        return [parsedVal];
      }

      // 3. If it's a flat key-value map of sections (e.g. { "Description": "...", "Installation": "..." })
      const keys = Object.keys(parsedVal);
      const stringValues = keys.filter(k => typeof parsedVal[k] === 'string');
      if (stringValues.length > 0 && stringValues.length >= keys.length * 0.8) { // 80% of values are strings
        return stringValues.map(k => ({
          id: k.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, ''),
          title: k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
          content: parsedVal[k]
        }));
      }

      // 4. Try nested objects (depth-first search for any array or valid section map)
      for (const key of keys) {
        if (parsedVal[key] && typeof parsedVal[key] === 'object') {
          const res = extractArray(parsedVal[key]);
          if (res) return res;
        }
      }
    }
    return null;
  }

  // 1. Try direct parse
  try {
    const parsed = JSON.parse(cleaned);
    const result = extractArray(parsed);
    if (result) return result;
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
    if (result) return result;
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
      if (Array.isArray(parsed)) return parsed;
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
        if (Array.isArray(parsed)) return parsed;
      } catch (_) {}
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
      if (result) return result;
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
        if (result) return result;
      } catch (_) {}
    }
  }

  throw new Error("Could not parse AI response as a valid JSON array or object containing sections.");
}
