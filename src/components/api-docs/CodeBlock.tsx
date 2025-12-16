import { useState } from 'react';
import { Check, Copy, Terminal, FileJson, FileCode } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface CodeBlockProps {
  code: string;
  language?: string;
  title?: string;
  showLineNumbers?: boolean;
  highlightLines?: number[];
  className?: string;
}

const languageIcons: Record<string, React.ReactNode> = {
  bash: <Terminal className="h-3.5 w-3.5" />,
  shell: <Terminal className="h-3.5 w-3.5" />,
  curl: <Terminal className="h-3.5 w-3.5" />,
  json: <FileJson className="h-3.5 w-3.5" />,
  javascript: <FileCode className="h-3.5 w-3.5" />,
  typescript: <FileCode className="h-3.5 w-3.5" />,
  python: <FileCode className="h-3.5 w-3.5" />,
  php: <FileCode className="h-3.5 w-3.5" />,
};

const languageLabels: Record<string, string> = {
  bash: 'Bash',
  shell: 'Shell',
  curl: 'cURL',
  json: 'JSON',
  javascript: 'JavaScript',
  typescript: 'TypeScript',
  python: 'Python',
  php: 'PHP',
};

// Simple syntax highlighting
const highlightSyntax = (code: string, language: string): string => {
  let highlighted = code
    // Escape HTML
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  if (language === 'json') {
    highlighted = highlighted
      // Strings
      .replace(/"([^"\\]*(\\.[^"\\]*)*)"/g, '<span class="text-emerald-400">"$1"</span>')
      // Numbers
      .replace(/\b(\d+\.?\d*)\b/g, '<span class="text-amber-400">$1</span>')
      // Booleans and null
      .replace(/\b(true|false|null)\b/g, '<span class="text-purple-400">$1</span>')
      // Keys (property names before colon)
      .replace(/<span class="text-emerald-400">"([^"]+)"<\/span>:/g, '<span class="text-sky-400">"$1"</span>:');
  } else if (['javascript', 'typescript'].includes(language)) {
    highlighted = highlighted
      // Comments
      .replace(/(\/\/.*$)/gm, '<span class="text-muted-foreground">$1</span>')
      // Strings
      .replace(/(['"`])(?:(?!\1)[^\\]|\\.)*\1/g, '<span class="text-emerald-400">$&</span>')
      // Keywords
      .replace(/\b(const|let|var|function|return|if|else|for|while|async|await|import|export|from|class|new|try|catch|throw)\b/g, '<span class="text-purple-400">$1</span>')
      // Numbers
      .replace(/\b(\d+\.?\d*)\b/g, '<span class="text-amber-400">$1</span>');
  } else if (language === 'python') {
    highlighted = highlighted
      // Comments
      .replace(/(#.*$)/gm, '<span class="text-muted-foreground">$1</span>')
      // Strings
      .replace(/(['"])(?:(?!\1)[^\\]|\\.)*\1/g, '<span class="text-emerald-400">$&</span>')
      // Keywords
      .replace(/\b(def|return|if|else|for|while|import|from|class|try|except|with|as|True|False|None)\b/g, '<span class="text-purple-400">$1</span>')
      // Numbers
      .replace(/\b(\d+\.?\d*)\b/g, '<span class="text-amber-400">$1</span>');
  } else if (language === 'php') {
    highlighted = highlighted
      // Comments
      .replace(/(\/\/.*$)/gm, '<span class="text-muted-foreground">$1</span>')
      // Strings
      .replace(/(['"])(?:(?!\1)[^\\]|\\.)*\1/g, '<span class="text-emerald-400">$&</span>')
      // Variables
      .replace(/(\$\w+)/g, '<span class="text-sky-400">$1</span>')
      // Keywords
      .replace(/\b(function|return|if|else|for|while|foreach|class|new|try|catch|throw|use|namespace|public|private|protected)\b/g, '<span class="text-purple-400">$1</span>');
  } else if (['bash', 'shell', 'curl'].includes(language)) {
    highlighted = highlighted
      // Comments
      .replace(/(#.*$)/gm, '<span class="text-muted-foreground">$1</span>')
      // Strings
      .replace(/(['"])(?:(?!\1)[^\\]|\\.)*\1/g, '<span class="text-emerald-400">$&</span>')
      // Commands
      .replace(/^(\s*)(curl|wget|npm|pip|composer)/gm, '$1<span class="text-purple-400">$2</span>')
      // Flags
      .replace(/(\s)(-{1,2}[\w-]+)/g, '$1<span class="text-sky-400">$2</span>');
  }

  return highlighted;
};

export const CodeBlock = ({ 
  code, 
  language = 'bash', 
  title, 
  showLineNumbers = false,
  highlightLines = [],
  className 
}: CodeBlockProps) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      toast.success('Código copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Erro ao copiar');
    }
  };

  const lines = code.split('\n');
  const highlightedCode = highlightSyntax(code, language);
  const highlightedLines = highlightedCode.split('\n');

  return (
    <div className={cn(
      'rounded-lg border border-border overflow-hidden bg-[#0d1117] text-gray-100',
      className
    )}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border/50 bg-[#161b22]">
        <div className="flex items-center gap-2">
          {/* Terminal dots */}
          <div className="hidden sm:flex items-center gap-1.5 mr-2">
            <span className="h-3 w-3 rounded-full bg-red-500/80" />
            <span className="h-3 w-3 rounded-full bg-yellow-500/80" />
            <span className="h-3 w-3 rounded-full bg-green-500/80" />
          </div>
          {languageIcons[language]}
          <span className="text-xs font-medium text-gray-400">
            {title || languageLabels[language] || language.toUpperCase()}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCopy}
          className="h-7 px-2 text-gray-400 hover:text-gray-100 hover:bg-white/10"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 mr-1.5" />
              <span className="text-xs">Copiado</span>
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5 mr-1.5" />
              <span className="text-xs">Copiar</span>
            </>
          )}
        </Button>
      </div>

      {/* Code */}
      <div className="overflow-x-auto">
        <pre className="p-4 text-sm leading-relaxed font-mono">
          {showLineNumbers ? (
            <table className="w-full border-collapse">
              <tbody>
                {highlightedLines.map((line, index) => (
                  <tr 
                    key={index}
                    className={cn(
                      highlightLines.includes(index + 1) && 'bg-primary/10'
                    )}
                  >
                    <td className="select-none text-right pr-4 text-gray-500 w-8 align-top">
                      {index + 1}
                    </td>
                    <td>
                      <code 
                        dangerouslySetInnerHTML={{ __html: line || '&nbsp;' }}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <code dangerouslySetInnerHTML={{ __html: highlightedCode }} />
          )}
        </pre>
      </div>
    </div>
  );
};

// Request/Response side-by-side component
interface CodeComparisonProps {
  request: { title?: string; code: string; language?: string };
  response: { title?: string; code: string; language?: string };
}

export const CodeComparison = ({ request, response }: CodeComparisonProps) => {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="h-5 w-5 rounded-full bg-sky-500/20 text-sky-500 flex items-center justify-center text-xs font-bold">→</span>
          <h4 className="text-sm font-semibold">Request</h4>
        </div>
        <CodeBlock 
          code={request.code} 
          language={request.language || 'json'} 
          title={request.title}
        />
      </div>
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="h-5 w-5 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center text-xs font-bold">←</span>
          <h4 className="text-sm font-semibold">Response</h4>
        </div>
        <CodeBlock 
          code={response.code} 
          language={response.language || 'json'} 
          title={response.title}
        />
      </div>
    </div>
  );
};
