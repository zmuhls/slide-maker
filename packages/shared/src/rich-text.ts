export type HtmlSanitizer = (html: string) => string

export function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function containsHtmlMarkup(value: string): boolean {
  return /<[^>]+>/.test(value)
}

function applyInlinePatterns(html: string): string {
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
  html = html.replace(/__(.+?)__/g, '<strong>$1</strong>')
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>')
  html = html.replace(/(?<!\w)_(.+?)_(?!\w)/g, '<em>$1</em>')
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_match, label, url) => {
    const safeUrl = /^(https?:\/\/|mailto:)/i.test(url) ? url : '#'
    return `<a href="${escapeHtml(safeUrl)}" target="_blank" rel="noopener">${label}</a>`
  })
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>')
  return html
}

/** Inline markdown without HTML escaping — use with an external sanitizer (e.g. DOMPurify). */
export function inlineMarkdown(text: string): string {
  return applyInlinePatterns(text)
}

function inlineMarkdownToHtml(text: string): string {
  return applyInlinePatterns(escapeHtml(text))
}

export function markdownToHtml(markdown: string): string {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n')
  const out: string[] = []

  let paragraphLines: string[] = []
  let quoteLines: string[] = []
  let listItems: string[] = []
  let listType: 'ul' | 'ol' | null = null

  const flushParagraph = () => {
    if (paragraphLines.length === 0) return
    out.push(`<p>${inlineMarkdownToHtml(paragraphLines.join(' '))}</p>`)
    paragraphLines = []
  }

  const flushQuote = () => {
    if (quoteLines.length === 0) return
    out.push(`<blockquote><p>${quoteLines.map(inlineMarkdownToHtml).join('<br>')}</p></blockquote>`)
    quoteLines = []
  }

  const flushList = () => {
    if (!listType || listItems.length === 0) return
    out.push(`<${listType}>${listItems.join('')}</${listType}>`)
    listItems = []
    listType = null
  }

  const flushAll = () => {
    flushParagraph()
    flushQuote()
    flushList()
  }

  for (const rawLine of lines) {
    const line = rawLine.trim()

    if (!line) {
      flushAll()
      continue
    }

    const headingMatch = line.match(/^(#{1,4})\s+(.+)$/)
    if (headingMatch) {
      flushAll()
      const level = headingMatch[1].length
      out.push(`<h${level}>${inlineMarkdownToHtml(headingMatch[2])}</h${level}>`)
      continue
    }

    const quoteMatch = line.match(/^>\s?(.*)$/)
    if (quoteMatch) {
      flushParagraph()
      flushList()
      quoteLines.push(quoteMatch[1])
      continue
    }

    const bulletMatch = line.match(/^[-*]\s+(.+)$/)
    if (bulletMatch) {
      flushParagraph()
      flushQuote()
      if (listType !== 'ul') {
        flushList()
        listType = 'ul'
      }
      listItems.push(`<li>${inlineMarkdownToHtml(bulletMatch[1])}</li>`)
      continue
    }

    const numberedMatch = line.match(/^\d+\.\s+(.+)$/)
    if (numberedMatch) {
      flushParagraph()
      flushQuote()
      if (listType !== 'ol') {
        flushList()
        listType = 'ol'
      }
      listItems.push(`<li>${inlineMarkdownToHtml(numberedMatch[1])}</li>`)
      continue
    }

    flushQuote()
    flushList()
    paragraphLines.push(line)
  }

  flushAll()
  return out.join('\n')
}

function hasMeaningfulHtml(html: string): boolean {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim().length > 0
}

function getFirstString(values: unknown[]): string {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value
  }
  return ''
}

export function renderRichTextData(
  data: Record<string, unknown>,
  sanitize: HtmlSanitizer,
): string {
  const rawHtml = typeof data.html === 'string' ? data.html : ''
  const safeHtml = rawHtml ? sanitize(rawHtml) : ''

  if (safeHtml && hasMeaningfulHtml(safeHtml)) {
    return safeHtml
  }

  const markdown = getFirstString([data.markdown, data.content, data.text])
  if (markdown) {
    return sanitize(markdownToHtml(markdown))
  }

  return safeHtml
}

export function renderFormattedContent(
  value: unknown,
  sanitize: HtmlSanitizer,
): string {
  const content = typeof value === 'string' ? value : ''
  if (!content) return ''
  return containsHtmlMarkup(content) ? sanitize(content) : escapeHtml(content)
}
