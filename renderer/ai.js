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
async function generateAIExtractedReadme(stats, apiKey, modelName = 'gemini-2.5-flash', aiStyle = 'balanced') {
  if (!apiKey) {
    console.log(`No API key provided, returning Mock generated sections with style: ${aiStyle}.`);
    return generateMockReadme(stats, aiStyle);
  }

  // Adjust prompt style instructions based on style choice
  let styleInstruction = "";
  if (aiStyle === 'concise') {
    styleInstruction = "Make the generated README extremely concise, brief, and direct. Focus only on the absolute essentials (brief description, quick install/run commands, key features). Avoid long paragraphs, wordy descriptions, or unnecessary detail. Use bullet points and keep explanations to 1-2 sentences max.";
  } else if (aiStyle === 'detailed') {
    styleInstruction = "Make the generated README highly detailed, comprehensive, and technical. Elaborate thoroughly on features, configuration files, directory layout, code design decisions, API sections, and future improvements. Add descriptive paragraphs and explain everything in depth.";
  } else {
    styleInstruction = "Maintain a balanced, standard, and professional level of detail (balanced style).";
  }

  // Create prompt detailing the scanned project stats
  const prompt = `
You are a senior software engineer writing a README.md for your own project. 
Write the documentation from the perspective of the project developer. It must read 100% naturally, as if a human engineer wrote it.

CRITICAL GUIDELINES:
1. NEVER mention "the scanner", "detection", "the scanned report", "the AI", or refer to any automated scanning process. Do not write phrases like "HTML was detected as..." or "No license was detected for this project...".
2. If there is no license, simply write "This project is unlicensed." or state that it is under proprietary terms. Do not say "no license was detected".
3. Write about the project's tech stack naturally. For example, if HTML is statistically the primary language due to build output/dependency files, but the core logic is in Python, write about it as a Python project without explaining the scan discrepancy.
4. Avoid meta-commentary. Focus objective language on what the project does, how to install it, and how to use it. Do not explain *why* something is in the README, just write the content directly.

Writing Style Instruction:
${styleInstruction}

Project Name: ${stats.projectName}
Primary Language: ${stats.primaryLanguage}
Languages details: ${JSON.stringify(stats.languages)}
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

Based on this, you must output a JSON array of objects representing the sections of the README.md.
Do NOT output anything else except a valid JSON array. Do not put markdown code fences around the JSON itself.
The JSON array should contain objects, each with these exact properties:
- "id": A unique string key for the section (e.g. "title", "description", "features", "installation", "usage", "folder_structure", "technologies", "architecture", "development", "api", "configuration", "contributing", "license", "faq")
- "title": The header name of the section (e.g. "Description", "Key Features", "Installation Instructions")
- "content": The markdown content of the section. Important: Do NOT include the section header (like "# My Project" or "## Installation") inside the content string, because the UI renders the section title separately. Use clean, professional, and detailed markdown with proper tables, code blocks, lists, and badges where appropriate.

Make sure to infer missing information from the project details instead of fabricating/hallucinating unrelated things. Add badges for language, license, files, and build tools in the "title" or top of the "description" section.

Ensure your JSON output can be directly parsed via JSON.parse(). Double-escape any backslashes in code snippets if necessary.
`;

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          responseMimeType: 'application/json'
        }
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API returned error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const resultText = data.candidates[0].content.parts[0].text;
    
    // Parse the JSON array of sections
    try {
      const parsedSections = JSON.parse(resultText.trim());
      if (Array.isArray(parsedSections)) {
        return parsedSections;
      }
      throw new Error('Response is not a JSON Array');
    } catch (parseError) {
      console.error('Failed to parse AI JSON response:', resultText, parseError);
      // Attempt clean markdown extraction if Gemini didn't format it as pure JSON
      const cleanJsonStr = extractJsonFromString(resultText);
      if (cleanJsonStr) {
        return JSON.parse(cleanJsonStr);
      }
      throw parseError;
    }
  } catch (error) {
    console.error('Gemini API call failed, falling back to mock generator:', error);
    alert(`AI Generation failed (${error.message}). Falling back to Offline Template Mode.`);
    return generateMockReadme(stats);
  }
}

// Single section AI regeneration
async function regenerateAISection(sectionId, sectionTitle, currentContent, stats, instructions, apiKey, modelName = 'gemini-2.5-flash') {
  if (!apiKey) {
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
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const resultText = data.candidates[0].content.parts[0].text;
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
