import type { JSONContent } from '@tiptap/core'

/**
 * Convert TipTap JSON document to markdown string.
 * Pure function — no dependencies beyond the JSONContent type.
 */
export function tiptapJsonToMarkdown(doc: JSONContent): string {
  if (!doc.content) return ''
  return renderNodes(doc.content).replace(/\n{3,}/g, '\n\n').trim()
}

function renderNodes(nodes: JSONContent[]): string {
  return nodes.map(renderNode).join('')
}

function renderNode(node: JSONContent): string {
  switch (node.type) {
    case 'paragraph':
      return renderInline(node.content) + '\n\n'

    case 'heading': {
      const level = node.attrs?.level ?? 1
      const prefix = '#'.repeat(Math.min(level, 3))
      return `${prefix} ${renderInline(node.content)}\n\n`
    }

    case 'bulletList':
      return renderListItems(node.content, '-') + '\n'

    case 'orderedList':
      return renderOrderedItems(node.content) + '\n'

    case 'listItem':
      return renderInline(node.content)

    case 'codeBlock': {
      const lang = node.attrs?.language ?? ''
      const code = getPlainText(node.content)
      return `\`\`\`${lang}\n${code}\n\`\`\`\n\n`
    }

    case 'hardBreak':
      return '\n'

    case 'text':
      return applyMarks(node.text ?? '', node.marks)

    default:
      // Unknown node — extract text content as fallback
      if (node.content) return renderNodes(node.content)
      return node.text ?? ''
  }
}

function renderInline(content?: JSONContent[]): string {
  if (!content) return ''
  return content.map(renderNode).join('')
}

function renderListItems(items: JSONContent[] | undefined, bullet: string): string {
  if (!items) return ''
  return items
    .map((item) => {
      const text = renderListItemContent(item.content)
      return `${bullet} ${text}`
    })
    .join('\n')
}

function renderOrderedItems(items: JSONContent[] | undefined): string {
  if (!items) return ''
  return items
    .map((item, i) => {
      const text = renderListItemContent(item.content)
      return `${i + 1}. ${text}`
    })
    .join('\n')
}

function renderListItemContent(content?: JSONContent[]): string {
  if (!content) return ''
  // List items wrap content in paragraphs — flatten them
  return content
    .map((child) => {
      if (child.type === 'paragraph') return renderInline(child.content)
      return renderNode(child)
    })
    .join('\n')
}

function getPlainText(content?: JSONContent[]): string {
  if (!content) return ''
  return content
    .map((node) => {
      if (node.type === 'text') return node.text ?? ''
      if (node.type === 'hardBreak') return '\n'
      if (node.content) return getPlainText(node.content)
      return ''
    })
    .join('')
}

function applyMarks(text: string, marks?: JSONContent['marks']): string {
  if (!marks || !marks.length || !text) return text

  let result = text
  for (const mark of marks) {
    switch (mark.type) {
      case 'bold':
        result = `**${result}**`
        break
      case 'italic':
        result = `*${result}*`
        break
      case 'strike':
        result = `~~${result}~~`
        break
      case 'code':
        result = `\`${result}\``
        break
      case 'link': {
        const safeText = result.replace(/[\[\]]/g, '\\$&')
        const safeHref = (mark.attrs?.href ?? '').replace(/[()]/g, '\\$&')
        result = `[${safeText}](${safeHref})`
        break
      }
    }
  }
  return result
}
