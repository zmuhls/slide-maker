import DOMPurify from 'dompurify'
import { inlineMarkdown, markdownToHtml, containsHtmlMarkup } from '@slide-maker/shared'

export { inlineMarkdown }

/** Convert markdown string to sanitized HTML, or pass through existing HTML.
 *  Mixed content (HTML + markdown syntax) gets inline markdown applied too. */
export function renderContent(content: string): string {
  if (!content) return ''
  if (containsHtmlMarkup(content)) {
    return DOMPurify.sanitize(inlineMarkdown(content))
  }
  return DOMPurify.sanitize(markdownToHtml(content))
}
