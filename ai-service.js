const dns = require('dns');

// Simple connection check helper
function checkConnection() {
  return new Promise((resolve) => {
    dns.lookup('google.com', (err) => {
      resolve(err === null);
    });
  });
}

// Fetch helper with timeout and retries (rate-limit / backoff)
async function fetchWithRetry(url, options = {}, onProgress, maxRetries = 3, abortSignal = null) {
  const { timeout = 180000, ...fetchOptions } = options;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    // Respect external cancellation before attempting
    if (abortSignal && abortSignal.aborted) {
      throw Object.assign(new Error('Generation cancelled by user.'), { name: 'AbortError' });
    }

    const timeoutController = new AbortController();
    const id = setTimeout(() => timeoutController.abort(), timeout);

    // Combine timeout signal with optional external abort signal
    const signals = [timeoutController.signal];
    if (abortSignal) signals.push(abortSignal);
    const combinedSignal = AbortSignal.any ? AbortSignal.any(signals) : timeoutController.signal;

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        signal: combinedSignal
      });
      clearTimeout(id);
      
      // Exponential backoff for 429 (rate limit) or 503 (service unavailable)
      if (response.status === 429 || response.status === 503) {
        const delay = Math.pow(2, attempt) * 2000 + Math.random() * 1000;
        if (onProgress) {
          onProgress('Rate limited / Service busy...', `Retrying in ${Math.round(delay/1000)}s (attempt ${attempt + 1}/${maxRetries})`);
        }
        await new Promise(r => setTimeout(r, delay));
        continue;
      }
      
      return response;
    } catch (error) {
      clearTimeout(id);
      // Propagate cancellation immediately without retrying
      if (error.name === 'AbortError') throw error;
      if (attempt === maxRetries - 1) {
        throw error;
      }
      const delay = Math.pow(2, attempt) * 2000 + Math.random() * 1000;
      if (onProgress) {
        onProgress('Network error...', `Retrying in ${Math.round(delay/1000)}s (attempt ${attempt + 1}/${maxRetries})`);
      }
      await new Promise(r => setTimeout(r, delay));
    }
  }
  throw new Error('Max retries exceeded');
}

// Sanitize sensitive credentials from error messages
function sanitizeError(error, keysToScrub = []) {
  let message = error.message || String(error);
  // Scrub key=xxxx from URLs
  message = message.replace(/key=[^&"\s]+/gi, 'key=***');
  // Scrub Bearer tokens
  message = message.replace(/Bearer\s+[^&"\s]+/gi, 'Bearer ***');
  
  for (const key of keysToScrub) {
    if (key && key.length > 5) {
      const escapedKey = key.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp(escapedKey, 'g');
      message = message.replace(regex, '***');
    }
  }
  return message;
}

// Helper to extract the thinking/reasoning property from raw JSON response
function extractThinkingFromJson(jsonStr) {
  try {
    const objStart = jsonStr.indexOf('{');
    const objEnd = jsonStr.lastIndexOf('}');
    if (objStart !== -1 && objEnd !== -1 && objEnd > objStart) {
      const objStr = jsonStr.substring(objStart, objEnd + 1);
      
      // Attempt to replace stray unescaped control characters inside content strings,
      // similar to what renderer/ai.js does, to prevent parsing errors
      let cleanedObjStr = objStr;
      try {
        cleanedObjStr = objStr.replace(
          /"thinking"\s*:\s*"([\s\S]*?)(?=",\s*"(?:sections)"|}])/g,
          (match, inner) => {
            return `"thinking": "${inner.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\r?\n/g, '\\n')}`;
          }
        );
      } catch (e) {}

      const parsed = JSON.parse(cleanedObjStr);
      if (parsed && typeof parsed === 'object' && typeof parsed.thinking === 'string') {
        return parsed.thinking;
      }
    }
  } catch (e) {
    // ignore
  }
  return null;
}

// Main AI Generation call
async function generateReadmeContentMain({ stats, options, apiKey, claudeKey, openaiKey }, onProgress, abortSignal = null) {
  const provider = options.provider;
  const activeKeys = [apiKey, claudeKey, openaiKey];
  let thinkingText = null;
  
  try {
    // 1. Connection Check for cloud providers
    if (provider !== 'ollama') {
      const isOnline = await checkConnection();
      if (!isOnline) {
        throw new Error('No internet connection detected. Please check your network.');
      }
    }

    if (onProgress) {
      onProgress('Preparing Codebase Context...', 'Analyzing project files and packaging key contents.');
    }

    // Styles
    let styleInstruction = "";
    if (options.style === 'concise') {
      styleInstruction = "Make the generated README concise, clear, and direct. Focus on key details (brief description, standard installation/run commands, main features) without unnecessary fluff or wordy explanations. Use clear bullet points and keep descriptions to-the-point, but ensure all essential context and information remains intact.";
    } else if (options.style === 'detailed') {
      styleInstruction = "Make the generated README highly detailed, comprehensive, and technical. Elaborate thoroughly on features, configuration files, directory layout, code design decisions, API sections, and future improvements. Add descriptive paragraphs and explain everything in depth.";
    } else {
      styleInstruction = "Maintain a balanced, standard, and professional level of detail (balanced style).";
    }

    // Build tree text
    let treeText = 'Not available';
    if (stats.projectTree) {
      // Helper to match renderer format
      const formatProjectTree = (node, prefix = "") => {
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
      };
      treeText = `${stats.projectTree.name}/\n${formatProjectTree(stats.projectTree)}`;
    }

    // Build key files text — apply a tighter budget for local models to avoid
    // slow inference caused by large context windows on modest hardware.
    const CLOUD_CHAR_BUDGET = 80000;
    const LOCAL_CHAR_BUDGET = 30000;
    const charBudget = provider === 'ollama' ? LOCAL_CHAR_BUDGET : CLOUD_CHAR_BUDGET;

    let keyFilesText = 'No key source files content extracted.';
    if (stats.keyFiles && stats.keyFiles.length > 0) {
      let accumulated = 0;
      const includedFiles = [];

      for (const file of stats.keyFiles) {
        const parts = file.path.split('.');
        const ext = parts.length > 1 ? parts[parts.length - 1] : '';
        const block = `### File: ${file.path}${file.isEntryPoint ? ' (ENTRY POINT)' : ''}\n\`\`\`${ext}\n${file.content}\n\`\`\``;

        if (!file.isEntryPoint && accumulated + block.length > charBudget) {
          break; // Budget exhausted — entry point always passes through above
        }
        includedFiles.push(block);
        accumulated += block.length;
      }

      keyFilesText = includedFiles.join('\n\n');
    }

    const systemPrompt = `You are a senior software engineer writing a README.md for your own project.
Write the documentation from the perspective of the project developer. It must read 100% naturally, as if a human engineer wrote it.

System instructions:
1. NEVER mention that this README itself was generated by AI, and do not reference any automated scanner/detection process used to build this documentation.
2. If there is no license, simply write "This project is unlicensed." or state that it is under proprietary terms.
3. Write about the project's tech stack naturally.
4. Avoid meta-commentary. Focus objective language on what the project does, how to install it, and how to use it.
5. Do NOT invent, hallucinate, or assume future features, roadmap items, or specific contribution lists. Keep any contribution section completely generic.
6. Whenever a command is outputted, always wrap it inside a fenced markdown code block using triple backticks with the appropriate language tag (e.g. \`\`\`bash).
7. You MUST only reference files and folders that actually exist in the "Project Directory Structure" provided.
8. For badges at the top of the README, ALWAYS write them as direct, inline markdown images using the format ![Label](https://img.shields.io/badge/...). Never use a mermaid.live URL or any external image service to represent a diagram.
9. Ensure proper markdown line breaks and spacing. Place a blank line before and after lists, code blocks, tables, and headers.
10. Be objective, factual, and direct. Do NOT use marketing hype.
11. Do NOT use raw HTML tags (<br>, <div>, <p>, etc.) in the markdown content unless strictly necessary inside a table.
12. Do NOT put a ## heading inside a section's "content" field — section headers are rendered separately by the application. Only use ### or deeper sub-headings when a section genuinely needs them.
13. The "Architecture" section MUST contain a mermaid diagram written as a fenced code block (\`\`\`mermaid ... \`\`\`). Do NOT use images, URLs, or mermaid.live links to represent the diagram.
14. In any Mermaid diagram, only use --> or -->> arrows. Do NOT use ---> (triple-dash) arrows — they are invalid syntax.
15. Do NOT use Mermaid subgraphs unless the architecture has clearly separated, named layers that genuinely benefit from grouping.
16. In any generated Mermaid diagram, you MUST wrap node labels containing parentheses, brackets, colons, slashes, or any other special characters in double quotes. For example, write 'UI["Frontend / UI (Jetpack Compose)"]'.
17. Your entire response must be the JSON object only — no preamble, no explanation, no trailing text before or after it.
18. In the "Folder Structure" section, ONLY write descriptions/comments for directories and files that are unique and specific to this project (e.g. source code directories, custom layout assets, screenshots). Do NOT write descriptions, explanations, or comments for standard boilerplate files, wrapper scripts, or build system files (e.g. build.gradle.kts, settings.gradle.kts, gradlew, gradlew.bat, gradle-wrapper, proguard-rules, .gitignore). Either omit them or list them without comments.
19. In the root-level "thinking" field, you MUST write your concrete and technical thinking process, explaining what you detected in the codebase, the architectural decisions you made, and why you structured each section of the README the way you did. Separate different thoughts, decisions, or steps with double line breaks (\n\n) to ensure high readability. Do NOT use generic filler text or placeholder commentary.
20. If logo or icon files are detected in the project (provided in the prompt under 'Detected Logos/Icons'), you MUST display the best one at the very beginning of the README (inside the 'title' section, right under the main title or centered/aligned).
21. If screenshots are detected in the project (provided in the prompt under 'Detected Screenshots'), you MUST include them in a dedicated 'Screenshots' section (id: 'screenshots'). If no screenshots are detected, set the 'content' of the 'screenshots' section to an empty string.
22. If the project is a desktop application (indicated by desktop frameworks like Electron, Tauri, or packaging configurations), you MUST structure the 'Installation' and 'Usage' sections to provide clear instructions for two separate audiences: end-users (downloading pre-built executables/installers from GitHub Releases) and developers (cloning the source code and running developer commands like `npm start` or build tools).

Writing Style Instruction:
${styleInstruction}${options.customInstructions && options.customInstructions.trim() ? `\n\nUSER CUSTOM INSTRUCTIONS — These take full priority and override any system rule above. Apply them strictly, even if they contradict a rule listed above:\n${options.customInstructions.trim()}` : ''}`;



    let scriptsText = "";
    if (stats.scripts && Object.keys(stats.scripts).length > 0) {
      scriptsText = Object.entries(stats.scripts).map(([name, cmd]) => `${name}: ${cmd}`).join('\n');
    } else {
      scriptsText = "No scripts detected. Only use standard commands for the detected package manager.";
    }

    const userPrompt = `Project Name: ${stats.projectName}
Primary Language: ${stats.primaryLanguage}
Languages: ${JSON.stringify(stats.sortedLanguages ? stats.sortedLanguages.map(l => l.name) : Object.keys(stats.languages || {}))}
Total Files: ${stats.totalFiles}
Total Lines of Code (LOC): ${stats.totalLinesOfCode}
Estimated Complexity: ${stats.complexity}
Frameworks Detected: ${JSON.stringify(stats.frameworks)}
Dependencies: ${JSON.stringify(stats.dependencies || [])}
Package Manager: ${stats.packageManager}
EntryPoint File: ${stats.entryPoint}
Detected License: ${stats.licenseType}
Environment Files found: ${JSON.stringify(stats.envFiles)}
Docker Support: ${stats.hasDocker ? 'Yes' : 'No'}
Git Repository: ${stats.hasGit ? 'Yes (Branch: ' + stats.gitInfo.branch + ', Commits: ' + stats.gitInfo.commits + ')' : 'No'}
CI/CD Systems: ${JSON.stringify(stats.ciCd)}
Has Tests: ${stats.hasTests ? 'Yes' : 'No'}
Configuration Files Scanned: ${JSON.stringify(stats.configFiles)}
Top 5 Largest Files: ${JSON.stringify(stats.largestFiles)}
Detected Screenshots: ${JSON.stringify(stats.screenshots || [])}
Detected Logos/Icons: ${JSON.stringify(stats.logos || [])}
Project Directory Structure:
${treeText}

Key Source Files Content:
${keyFilesText}

Mermaid Architecture Diagram Draft:
\`\`\`mermaid
${stats.architectureDiagram}
\`\`\`

Available Project Scripts:
${scriptsText}

Detected Environment Files:
${JSON.stringify(stats.envFiles || [])}

${provider === 'ollama'
  ? `Based on this, you must output the complete README.md in pure Markdown format.
Do NOT wrap your entire response in markdown code fences. Just output the raw markdown text.

You MUST structure your README using exactly these H2 (##) headings. Do not skip any of them:

# [Project Title]
[Badges]
[Brief tagline/description]

## Description
[Overview of the project]

## Key Features
[Bullet list of features]

## Technologies
[Tech stack and dependencies]

## Installation
[Installation commands]

## Usage
[How to run and execute]

## Folder Structure
[Directory layout]

## Screenshots
[Include screenshots as images if detected. Omit this heading and section completely if no screenshots are detected in the prompt.]

## Architecture
[Mermaid diagram]

## License
[License terms]

FINAL REMINDER: Every command written in the README must come from the available scripts listed above or be the standard install command for the detected package manager. If a command is not listed, omit it entirely.`
  : `Based on this, you must output a JSON object containing a "thinking" key and a "sections" key, which is an array of objects representing the sections of the README.md.

You MUST return a JSON object that adheres strictly to the following JSON Schema:
{
  "type": "object",
  "properties": {
    "thinking": {
      "type": "string",
      "description": "Your technical reasoning, codebase detections, and design decisions for each section of the README."
    },
    "sections": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "id": { "type": "string" },
          "title": { "type": "string" },
          "content": { "type": "string" }
        },
        "required": ["id", "title", "content"],
        "additionalProperties": false
      }
    }
  },
  "required": ["thinking", "sections"],
  "additionalProperties": false
}

CRITICAL RULES FOR THE "content" FIELD:
1. Newlines and double quotes inside the markdown content MUST be correctly escaped (e.g., using '\\n' and '\\"' respectively) so the response is valid JSON.
2. Do NOT repeat the section title or header inside the "content" field. For example, for the section with ID "description" and title "Description", do NOT start the content with "## Description". The ONLY exception is the section with ID "title", where the content MUST start with the main H1 header (e.g. "# Project Name").
3. Do NOT invent, hallucinate, or assume commands or scripts. Use only standard commands appropriate for the detected project technologies or those explicitly documented in the provided source files.

CRITICAL FORMATTING INSTRUCTIONS:
- Do NOT wrap the JSON response in markdown code blocks or code fences (e.g. do NOT use \`\`\`json ... \`\`\`).
- Do NOT include any introductory text, conversational preamble, or concluding remarks before or after the JSON object.
- The output MUST start with '{' and end with '}' and be directly parseable via JSON.parse().

You MUST include exactly these 10 sections in the "sections" array (do not skip or omit any of them):
- {"id": "title", "title": "Title"}
- {"id": "description", "title": "Description"}
- {"id": "features", "title": "Key Features"}
- {"id": "technologies", "title": "Technologies"}
- {"id": "installation", "title": "Installation"}
- {"id": "usage", "title": "Usage"}
- {"id": "folder_structure", "title": "Folder Structure"}
- {"id": "screenshots", "title": "Screenshots"}
- {"id": "architecture", "title": "Architecture"}
- {"id": "license", "title": "License"}

Here is a complete, real-world example of the expected JSON response containing all required sections:
{
  "thinking": "Detected a Node.js CLI project using Commander.js and Axios.\\n\\nDecided to generate a MIT license based on findings.\\n\\nStructured the installation section to show a global npm install, and the usage section to demonstrate the 'weather current' command.\\n\\nCreated a simple architectural diagram mapping the entry point CLI to the API client.",
  "sections": [
    {
      "id": "title",
      "title": "Title",
      "content": "# weather-cli\\n\\n![License](https://img.shields.io/badge/license-MIT-blue)\\n\\nA command-line interface to get real-time weather forecasts."
    },
    {
      "id": "description",
      "title": "Description",
      "content": "A command-line tool that fetches and displays real-time weather data and 5-day forecasts for any city in the world using the OpenWeatherMap API."
    },
    {
      "id": "features",
      "title": "Key Features",
      "content": "- **Real-time Weather**: Current temperature, humidity, wind speed, and conditions.\\n- **5-Day Forecast**: Daily breakdown of upcoming weather conditions.\\n- **Multi-unit Support**: Switch easily between Celsius (default) or Fahrenheit using the --units \\"imperial\\" flag."
    },
    {
      "id": "technologies",
      "title": "Technologies",
      "content": "- **Node.js** (v18+)\\n- **Commander.js** for CLI argument parsing\\n- **Axios** for API requests"
    },
    {
      "id": "installation",
      "title": "Installation",
      "content": "Install the CLI globally via npm:\\n\\n\`\`\`bash\\nnpm install -g weather-cli\\n\`\`\`"
    },
    {
      "id": "usage",
      "title": "Usage",
      "content": "Get the current weather for a city:\\n\\n\`\`\`bash\\nweather current London --units metric\\n\`\`\`"
    },
    {
      "id": "folder_structure",
      "title": "Folder Structure",
      "content": "- \`bin/weather.js\`: Entry point script for the global CLI command.\\n- \`lib/api.js\`: Handles connection and requests to the weather API.\\n- \`lib/formatter.js\`: Formats the temperature and output in the terminal."
    },
    {
      "id": "screenshots",
      "title": "Screenshots",
      "content": "![App Dashboard](assets/screenshots/dashboard.png)\\n\\n![Settings Screen](assets/screenshots/settings.png)"
    },
    {
      "id": "architecture",
      "title": "Architecture",
      "content": "\`\`\`mermaid\\ngraph LR\\n    CLI[bin/weather.js] --> APIClient[lib/api.js]\\n    APIClient --> OpenWeather[OpenWeatherMap API]\\n    CLI --> Formatter[lib/formatter.js]\\n\`\`\`"
    },
    {
      "id": "license",
      "title": "License",
      "content": "This project is licensed under the MIT License."
    }
  ]
}

FINAL REMINDER: Every command written in the README must come from the available scripts listed above or be the standard install command for the detected package manager. If a command is not listed, omit it entirely.`
}`;

    let resultText = '';

    // Provider Routing
    if (provider === 'gemini') {
      if (onProgress) onProgress('Connecting to Gemini AI...', 'Transmitting codebase metadata and key source files.');
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${options.modelName}:generateContent?key=${apiKey}`;
      
      const response = await fetchWithRetry(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: systemPrompt + "\n\n" + userPrompt }] }],
          generationConfig: { responseMimeType: 'application/json' }
        }),
        timeout: 180000
      }, onProgress, 3, abortSignal);

      if (!response.ok) {
        throw new Error(`Gemini API returned error: ${response.status} - ${await response.text()}`);
      }
      const data = await response.json();
      resultText = data.candidates[0].content.parts[0].text.trim();

    } else if (provider === 'claude') {
      if (onProgress) onProgress('Connecting to Anthropic Claude...', 'Transmitting codebase metadata.');
      const response = await fetchWithRetry('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': claudeKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: options.claudeModel,
          max_tokens: 8192,
          system: systemPrompt,
          messages: [
            { role: 'user', content: userPrompt },
            { role: 'assistant', content: '{"sections":[' }
          ]
        }),
        timeout: 180000
      }, onProgress, 3, abortSignal);

      if (!response.ok) {
        throw new Error(`Claude API returned error: ${response.status} - ${await response.text()}`);
      }
      const data = await response.json();
      let rawText = '';
      if (Array.isArray(data.content)) {
        const thinkingBlock = data.content.find(block => block.type === 'thinking');
        if (thinkingBlock) {
          thinkingText = thinkingBlock.thinking;
        }
        const textBlock = data.content.find(block => block.type === 'text');
        rawText = textBlock ? textBlock.text.trim() : '';
      } else {
        rawText = data.content[0].text.trim();
      }
      resultText = '{"sections":[' + rawText;

    } else if (provider === 'openai') {
      if (onProgress) onProgress('Connecting to OpenAI...', 'Transmitting codebase metadata.');
      const response = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
          model: options.openaiModel,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ]
        }),
        timeout: 180000
      }, onProgress, 3, abortSignal);

      if (!response.ok) {
        throw new Error(`OpenAI API returned error: ${response.status} - ${await response.text()}`);
      }
      const data = await response.json();
      resultText = data.choices[0].message.content.trim();

    } else if (provider === 'ollama') {
      if (!options.ollamaModel) throw new Error('No Ollama model selected.');
      if (onProgress) onProgress(`Connecting to local Ollama (${options.ollamaModel})...`, 'Sending codebase stats to your local model.');
      
      let url = `${options.ollamaUrl.replace(/\/$/, '')}/api/chat`;
      if (url.includes('://localhost')) {
        url = url.replace('://localhost', '://127.0.0.1');
      }

      let response;
      try {
        response = await fetchWithRetry(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: options.ollamaModel,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt }
            ],
            stream: false,
            think: false,
            options: {
              num_predict: 8192,
              temperature: 0.2,
              repeat_penalty: 1.2
            }
          }),
          timeout: 600000
        }, onProgress, 1, abortSignal);
      } catch (err) {
        if (err.name === 'AbortError') {
          throw err;
        }
        throw new Error(`Failed to connect to Ollama at ${url}. Please ensure:\n1. Ollama is running.\n2. You have downloaded the model by running: ollama run ${options.ollamaModel}\n3. The Ollama port is open and accessible.`);
      }

      if (!response.ok) {
        throw new Error(`Ollama API returned error: ${response.status} - ${await response.text()}`);
      }
      const data = await response.json();
      resultText = data.message.content.trim();
      if (data.message && data.message.reasoning_content) {
        thinkingText = data.message.reasoning_content;
      }
    }

    if (onProgress) {
      onProgress('Structuring README...', 'Generation finished. Formatting response.');
    }

    if (!thinkingText) {
      const thinkMatch = resultText.match(/<think>([\s\S]*?)<\/think>/i);
      if (thinkMatch) {
        thinkingText = thinkMatch[1].trim();
      }
    }

    if (!thinkingText) {
      thinkingText = extractThinkingFromJson(resultText);
    }

    return { success: true, resultText, thinkingText };

  } catch (error) {
    const cleanMsg = sanitizeError(error, activeKeys);
    return { success: false, error: cleanMsg };
  }
}

// Single section AI regeneration main call
async function regenerateAISectionMain({ sectionId, sectionTitle, currentContent, stats, instructions, options, apiKey, claudeKey, openaiKey }, onProgress) {
  const provider = options.provider;
  const activeKeys = [apiKey, claudeKey, openaiKey];

  try {
    if (provider !== 'ollama') {
      const isOnline = await checkConnection();
      if (!isOnline) {
        throw new Error('No internet connection detected.');
      }
    }

    let treeText = 'Not available';
    if (stats.projectTree) {
      const formatProjectTree = (node, prefix = "") => {
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
      };
      treeText = `${stats.projectTree.name}/\n${formatProjectTree(stats.projectTree)}`;
    }

    let keyFilesText = 'No key source files content extracted.';
    if (stats.keyFiles && stats.keyFiles.length > 0) {
      keyFilesText = stats.keyFiles.map(file => {
        const parts = file.path.split('.');
        const ext = parts.length > 1 ? parts[parts.length - 1] : '';
        return `### File: ${file.path}${file.isEntryPoint ? ' (ENTRY POINT)' : ''}\n\`\`\`${ext}\n${file.content}\n\`\`\``;
      }).join('\n\n');
    }

    const prompt = `
You are an expert technical writer. The user wants to regenerate a specific section of their project README.md file.
You MUST only reference files and folders that actually exist in the "Project Directory Structure" provided below. Do NOT invent, assume, or hallucinate other files, scripts, directories, or utilities that are not listed in the directory tree.

Project Name: ${stats.projectName}
Primary Language: ${stats.primaryLanguage}
Frameworks Detected: ${JSON.stringify(stats.frameworks)}
Package Manager: ${stats.packageManager}
Detected Screenshots: ${JSON.stringify(stats.screenshots || [])}
Detected Logos/Icons: ${JSON.stringify(stats.logos || [])}

Project Directory Structure:
${treeText}

Key Source Files Content:
${keyFilesText}

Section to update: "${sectionTitle}" (id: ${sectionId})
Current Content:
${currentContent}

User Instructions for modification:
"${instructions}"

Please rewrite this section content based on the user instructions and project context.
Do NOT include the section header (like "## ${sectionTitle}") in your output. Just output the clean markdown body of the section. Do not wrap the output in markdown code fences unless the content itself is a code block.
`;

    let resultText = '';

    if (provider === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${options.modelName}:generateContent?key=${apiKey}`;
      const response = await fetchWithRetry(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        }),
        timeout: 180000
      }, onProgress);
      if (!response.ok) throw new Error(`Gemini API error: ${response.status} - ${await response.text()}`);
      const data = await response.json();
      resultText = data.candidates[0].content.parts[0].text;

    } else if (provider === 'claude') {
      const response = await fetchWithRetry('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': claudeKey,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: options.claudeModel,
          max_tokens: 4096,
          system: 'You are an expert technical writer. The user wants to regenerate a specific section of their project README.md file. Be objective and factual, avoiding hype.',
          messages: [{ role: 'user', content: prompt }]
        }),
        timeout: 180000
      }, onProgress);
      if (!response.ok) throw new Error(`Claude API error: ${response.status} - ${await response.text()}`);
      const data = await response.json();
      resultText = data.content[0].text;

    } else if (provider === 'openai') {
      const response = await fetchWithRetry('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiKey}`
        },
        body: JSON.stringify({
          model: options.openaiModel,
          messages: [
            { role: 'system', content: 'You are an expert technical writer. The user wants to regenerate a specific section of their project README.md file. Be objective and factual, avoiding hype.' },
            { role: 'user', content: prompt }
          ]
        }),
        timeout: 180000
      }, onProgress);
      if (!response.ok) throw new Error(`OpenAI API error: ${response.status} - ${await response.text()}`);
      const data = await response.json();
      resultText = data.choices[0].message.content;

    } else if (provider === 'ollama') {
      if (!options.ollamaModel) throw new Error('No Ollama model selected.');
      let url = `${options.ollamaUrl.replace(/\/$/, '')}/api/chat`;
      if (url.includes('://localhost')) {
        url = url.replace('://localhost', '://127.0.0.1');
      }

      let response;
      try {
        response = await fetchWithRetry(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            model: options.ollamaModel,
            messages: [
              { role: 'system', content: 'You are an expert technical writer. The user wants to regenerate a specific section of their project README.md file. Be objective and factual, avoiding hype.' },
              { role: 'user', content: prompt }
            ],
            stream: false,
            options: {
              num_predict: 2048,
              num_ctx: 8192
            }
          }),
          timeout: 600000
        }, onProgress, 1);
      } catch (err) {
        throw new Error(`Failed to connect to Ollama at ${url}. Please ensure:\n1. Ollama is running.\n2. You have downloaded the model by running: ollama run ${options.ollamaModel}`);
      }

      if (!response.ok) throw new Error(`Ollama API error: ${response.status} - ${await response.text()}`);
      const data = await response.json();
      resultText = data.message.content;
    }

    return { success: true, resultText: resultText.trim() };
  } catch (error) {
    const cleanMsg = sanitizeError(error, activeKeys);
    return { success: false, error: cleanMsg };
  }
}

module.exports = {
  generateReadmeContentMain,
  regenerateAISectionMain
};
