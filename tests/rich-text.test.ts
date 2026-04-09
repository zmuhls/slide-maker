import { describe, it, expect } from 'vitest'
import {
  escapeHtml,
  containsHtmlMarkup,
  inlineMarkdown,
  markdownToHtml,
  renderRichTextData,
  renderFormattedContent,
} from '../packages/shared/src/rich-text'

describe('escapeHtml', () => {
  it('escapes all HTML-sensitive characters', () => {
    expect(escapeHtml('&<>"\''))
      .toBe('&amp;&lt;&gt;&quot;&#39;')
  })

  it('returns plain text unchanged', () => {
    expect(escapeHtml('hello world')).toBe('hello world')
  })

  it('handles empty string', () => {
    expect(escapeHtml('')).toBe('')
  })
})

describe('containsHtmlMarkup', () => {
  it('detects HTML tags', () => {
    expect(containsHtmlMarkup('<p>text</p>')).toBe(true)
    expect(containsHtmlMarkup('<strong>bold</strong>')).toBe(true)
    expect(containsHtmlMarkup('<br>')).toBe(true)
  })

  it('rejects plain text', () => {
    expect(containsHtmlMarkup('just text')).toBe(false)
    expect(containsHtmlMarkup('')).toBe(false)
  })

  it('rejects angle brackets without tag structure', () => {
    expect(containsHtmlMarkup('3 < 5')).toBe(false)
  })
})

describe('inlineMarkdown', () => {
  it('converts **bold**', () => {
    expect(inlineMarkdown('**bold**')).toBe('<strong>bold</strong>')
  })

  it('converts __bold__', () => {
    expect(inlineMarkdown('__bold__')).toBe('<strong>bold</strong>')
  })

  it('converts *italic*', () => {
    expect(inlineMarkdown('*italic*')).toBe('<em>italic</em>')
  })

  it('converts _italic_ with word boundaries', () => {
    expect(inlineMarkdown('some _italic_ text')).toBe('some <em>italic</em> text')
  })

  it('does not convert underscores mid-word', () => {
    expect(inlineMarkdown('snake_case_name')).toBe('snake_case_name')
  })

  it('converts `code`', () => {
    expect(inlineMarkdown('use `console.log`')).toBe('use <code>console.log</code>')
  })

  it('converts [link](url) with valid https', () => {
    const result = inlineMarkdown('[click](https://example.com)')
    expect(result).toContain('href="https://example.com"')
    expect(result).toContain('target="_blank"')
    expect(result).toContain('rel="noopener"')
  })

  it('rejects non-http link URLs', () => {
    const result = inlineMarkdown('[click](javascript:alert(1))')
    expect(result).toContain('href="#"')
  })

  it('allows mailto links', () => {
    const result = inlineMarkdown('[email](mailto:a@b.com)')
    expect(result).toContain('href="mailto:a@b.com"')
  })

  it('handles mixed inline patterns', () => {
    const result = inlineMarkdown('**bold** and *italic* and `code`')
    expect(result).toContain('<strong>bold</strong>')
    expect(result).toContain('<em>italic</em>')
    expect(result).toContain('<code>code</code>')
  })
})

describe('markdownToHtml', () => {
  it('converts headings h1-h4', () => {
    expect(markdownToHtml('# H1')).toContain('<h1>')
    expect(markdownToHtml('## H2')).toContain('<h2>')
    expect(markdownToHtml('### H3')).toContain('<h3>')
    expect(markdownToHtml('#### H4')).toContain('<h4>')
  })

  it('ignores h5+ (regex only matches 1-4)', () => {
    const result = markdownToHtml('##### H5')
    expect(result).not.toContain('<h5>')
    // treated as paragraph
    expect(result).toContain('<p>')
  })

  it('converts bullet lists', () => {
    const result = markdownToHtml('- item one\n- item two')
    expect(result).toContain('<ul>')
    expect(result).toContain('<li>')
    expect(result).toMatch(/item one.*item two/s)
  })

  it('converts ordered lists', () => {
    const result = markdownToHtml('1. first\n2. second')
    expect(result).toContain('<ol>')
    expect(result).toContain('<li>')
  })

  it('switches list types on boundary', () => {
    const result = markdownToHtml('- bullet\n\n1. numbered')
    expect(result).toContain('<ul>')
    expect(result).toContain('</ul>')
    expect(result).toContain('<ol>')
    expect(result).toContain('</ol>')
  })

  it('converts blockquotes', () => {
    const result = markdownToHtml('> quoted text')
    expect(result).toContain('<blockquote>')
    expect(result).toContain('quoted text')
  })

  it('wraps paragraphs', () => {
    const result = markdownToHtml('first paragraph')
    expect(result).toContain('<p>')
  })

  it('joins consecutive paragraph lines', () => {
    const result = markdownToHtml('line one\nline two')
    // consecutive lines joined with space in a single <p>
    expect(result).toContain('line one line two')
    // should be one paragraph, not two
    const pCount = (result.match(/<p>/g) || []).length
    expect(pCount).toBe(1)
  })

  it('flushes paragraphs on empty line', () => {
    const result = markdownToHtml('para one\n\npara two')
    const pCount = (result.match(/<p>/g) || []).length
    expect(pCount).toBe(2)
  })

  it('escapes HTML in text content', () => {
    const result = markdownToHtml('use <script> carefully')
    expect(result).toContain('&lt;script&gt;')
    expect(result).not.toContain('<script>')
  })

  it('applies inline formatting within blocks', () => {
    const result = markdownToHtml('- **bold** item')
    expect(result).toContain('<strong>bold</strong>')
  })

  it('returns empty string for empty input', () => {
    expect(markdownToHtml('')).toBe('')
  })
})

describe('renderRichTextData', () => {
  const identity = (html: string) => html

  it('prefers html field when meaningful', () => {
    const result = renderRichTextData(
      { html: '<p>hello</p>', markdown: '# fallback' },
      identity,
    )
    expect(result).toBe('<p>hello</p>')
  })

  it('falls through empty html to markdown', () => {
    const result = renderRichTextData(
      { html: '', markdown: '**bold**' },
      identity,
    )
    expect(result).toContain('<strong>bold</strong>')
  })

  it('falls through whitespace-only html to markdown', () => {
    const result = renderRichTextData(
      { html: '<p>   </p>', markdown: 'text' },
      identity,
    )
    expect(result).toContain('<p>text</p>')
  })

  it('tries content field after markdown', () => {
    const result = renderRichTextData({ content: 'fallback' }, identity)
    expect(result).toContain('fallback')
  })

  it('tries text field last', () => {
    const result = renderRichTextData({ text: 'last' }, identity)
    expect(result).toContain('last')
  })

  it('returns empty string when no fields present', () => {
    expect(renderRichTextData({}, identity)).toBe('')
  })

  it('invokes sanitizer on html output', () => {
    let called = false
    const spy = (html: string) => { called = true; return html }
    renderRichTextData({ html: '<p>test</p>' }, spy)
    expect(called).toBe(true)
  })

  it('invokes sanitizer on markdown output', () => {
    let called = false
    const spy = (html: string) => { called = true; return html }
    renderRichTextData({ markdown: '**test**' }, spy)
    expect(called).toBe(true)
  })
})

describe('renderFormattedContent', () => {
  const identity = (html: string) => html

  it('passes HTML content through sanitizer', () => {
    let sanitized = ''
    const spy = (html: string) => { sanitized = html; return html }
    renderFormattedContent('<p>hello</p>', spy)
    expect(sanitized).toBe('<p>hello</p>')
  })

  it('escapes plain text instead of sanitizing', () => {
    const result = renderFormattedContent('plain & simple', identity)
    expect(result).toBe('plain &amp; simple')
  })

  it('returns empty string for non-string input', () => {
    expect(renderFormattedContent(null, identity)).toBe('')
    expect(renderFormattedContent(undefined, identity)).toBe('')
    expect(renderFormattedContent(42, identity)).toBe('')
  })

  it('returns empty string for empty string', () => {
    expect(renderFormattedContent('', identity)).toBe('')
  })
})
