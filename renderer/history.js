// Generation History and Version Comparison Module

// Save a version to history
function saveToHistory(projectName, projectPath, sections, markdown) {
  try {
    const historyJson = localStorage.getItem('readme_generator_history');
    let history = historyJson ? JSON.parse(historyJson) : [];
    
    // Limit to 20 history entries
    if (history.length >= 20) {
      history.pop();
    }

    const newEntry = {
      id: 'hist_' + Date.now(),
      timestamp: new Date().toLocaleString(),
      projectName,
      projectPath,
      sections,
      markdown
    };

    history.unshift(newEntry);
    localStorage.setItem('readme_generator_history', JSON.stringify(history));
    return newEntry;
  } catch (e) {
    console.error('Failed to save to history:', e);
    return null;
  }
}

// Retrieve history
function getHistory() {
  try {
    const historyJson = localStorage.getItem('readme_generator_history');
    return historyJson ? JSON.parse(historyJson) : [];
  } catch (e) {
    return [];
  }
}

// Delete history item
function deleteHistoryItem(id) {
  try {
    const history = getHistory();
    const updated = history.filter(item => item.id !== id);
    localStorage.setItem('readme_generator_history', JSON.stringify(updated));
    return true;
  } catch (e) {
    return false;
  }
}

// Longest Common Subsequence (LCS) Line-based Diff Algorithm
// Computes diff lines: { type: 'added' | 'removed' | 'normal', text: string }
function diffStrings(oldText, newText) {
  const oldLines = oldText.split('\n');
  const newLines = newText.split('\n');
  
  const m = oldLines.length;
  const n = newLines.length;
  
  // LCS Table
  const dp = Array(m + 1).fill(0).map(() => Array(n + 1).fill(0));
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (oldLines[i - 1] === newLines[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  
  // Backtrack to build the diff
  let i = m;
  let j = n;
  const diff = [];
  
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldLines[i - 1] === newLines[j - 1]) {
      diff.unshift({ type: 'normal', text: oldLines[i - 1] });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      diff.unshift({ type: 'added', text: newLines[j - 1] });
      j--;
    } else if (i > 0 && (j === 0 || dp[i][j - 1] < dp[i - 1][j])) {
      diff.unshift({ type: 'removed', text: oldLines[i - 1] });
      i--;
    }
  }
  
  return diff;
}
