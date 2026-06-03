import React from 'react';
import { ExternalLink } from 'lucide-react';

/**
 * Validates that all markdown links inside the text only use safe URLs (http:// or https://)
 * and do not contain dangerous schemes like javascript:, data:, etc.
 */
export function validateRedditMarkdownLinks(text: string): { isValid: boolean; error?: string } {
  if (!text) return { isValid: true };
  
  // Find all matches of md-link: [some text](some_url)
  const regex = /\[([^\]]*?)\]\(([^)]*?)\)/g;
  let match;
  
  while ((match = regex.exec(text)) !== null) {
    const url = match[2].trim();
    
    // Check if it is a safe scheme
    const isSafe = url.startsWith('https://') || url.startsWith('http://');
    const isUnsafePrefix = /^(javascript:|data:|vbscript:|file:|chrome:|about:)/i.test(url);
    const hasScriptTag = url.toLowerCase().includes('<script') || url.toLowerCase().includes('script:');
    
    if (!isSafe || isUnsafePrefix || hasScriptTag) {
      return {
        isValid: false,
        error: `Only safe links starting with http:// or https:// are allowed. Rejected unsafe link: ${url}`
      };
    }
  }
  return { isValid: true };
}

/**
 * Safely parses and renders Reddit-style markdown links ([text](url)) into safe React elements.
 * Prevents XSS by avoiding dangerouslySetInnerHTML.
 */
export function renderRedditMarkdown(text: string, isLight: boolean = false): React.ReactNode {
  if (!text) return null;
  
  // Regex to match [text](url)
  const regex = /\[([^\]]*?)\]\(([^)]*?)\)/g;
  
  const nodes: React.ReactNode[] = [];
  let lastIndex = 0;
  let match;
  let safetyCounter = 0;
  
  while ((match = regex.exec(text)) !== null && safetyCounter < 500) {
    safetyCounter++;
    const matchIndex = match.index;
    const linkText = match[1];
    const url = match[2].trim();
    
    if (matchIndex > lastIndex) {
      nodes.push(text.substring(lastIndex, matchIndex));
    }
    
    // Verify link safety
    const isSafe = url.startsWith('https://') || url.startsWith('http://');
    const isUnsafePrefix = /^(javascript:|data:|vbscript:|file:|chrome:|about:)/i.test(url);
    const hasScriptScript = url.toLowerCase().includes('<script') || url.toLowerCase().includes('script:');
    
    if (isSafe && !isUnsafePrefix && !hasScriptScript) {
      nodes.push(
        <a 
          key={`markdown-link-${matchIndex}`}
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className={`font-bold transition-all inline-flex items-center gap-0.5 ${
            isLight 
              ? 'text-indigo-600 hover:text-indigo-800' 
              : 'text-indigo-400 hover:text-indigo-300'
          }`}
          onClick={(e) => e.stopPropagation()}
        >
          {linkText}
          <ExternalLink className="w-2.5 h-2.5 inline shrink-0" />
        </a>
      );
    } else {
      nodes.push(`[${linkText}](${url})`);
    }
    
    lastIndex = regex.lastIndex;
  }
  
  if (lastIndex < text.length) {
    nodes.push(text.substring(lastIndex));
  }
  
  return <span className="whitespace-pre-wrap select-text">{nodes}</span>;
}
