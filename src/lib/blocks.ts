import { v4 as uuidv4 } from 'uuid'

export function enrichBlockIds(contentJson: any): any {
  if (!contentJson || typeof contentJson !== 'object') {
    return contentJson
  }

  // Clone to avoid mutation side-effects
  const doc = JSON.parse(JSON.stringify(contentJson))

  if (doc.type === 'doc' && Array.isArray(doc.content)) {
    doc.content = doc.content.map((node: any) => {
      if (node && typeof node === 'object') {
        // Enforce block IDs for structural content blocks
        const blockTypes = ['paragraph', 'heading', 'blockquote', 'image', 'codeBlock', 'horizontalRule']
        if (blockTypes.includes(node.type)) {
          node.attrs = node.attrs || {}
          if (!node.attrs.block_id) {
            node.attrs.block_id = uuidv4()
          }
        }
      }
      return node
    })
  }

  return doc
}

// Extractor helper to get a plain text snippet from a TipTap block for the community feed
export function getBlockSnippet(contentJson: any, blockId: string, maxLength: number = 100): string {
  if (!contentJson || typeof contentJson !== 'object') return ''

  if (contentJson.type === 'doc' && Array.isArray(contentJson.content)) {
    for (const node of contentJson.content) {
      if (node && typeof node === 'object' && node.attrs?.block_id === blockId) {
        // Concatenate all text inside the block
        let text = ''
        if (Array.isArray(node.content)) {
          const extractText = (contentList: any[]) => {
            for (const child of contentList) {
              if (child.type === 'text') {
                text += child.text
              } else if (Array.isArray(child.content)) {
                extractText(child.content)
              }
            }
          }
          extractText(node.content)
        }
        
        if (text) {
          return text.length > maxLength ? `${text.slice(0, maxLength)}...` : text
        }
        return `[${node.type}]`
      }
    }
  }

  return 'a block'
}

export function renderTipTapToHtml(contentJson: any): string {
  if (!contentJson || typeof contentJson !== 'object') return ''
  if (contentJson.type !== 'doc' || !Array.isArray(contentJson.content)) return ''

  let html = ''
  for (const node of contentJson.content) {
    if (!node || typeof node !== 'object') continue

    const renderChildren = (children: any[]): string => {
      let text = ''
      for (const child of children) {
        if (child.type === 'text') {
          let content = child.text
          if (Array.isArray(child.marks)) {
            for (const mark of child.marks) {
              if (mark.type === 'bold') content = `<strong>${content}</strong>`
              if (mark.type === 'italic') content = `<em>${content}</em>`
              if (mark.type === 'code') content = `<code>${content}</code>`
              if (mark.type === 'link') content = `<a href="${mark.attrs?.href || '#'}" target="_blank" style="color: #6366f1; text-decoration: underline;">${content}</a>`
            }
          }
          text += content
        }
      }
      return text
    }

    const textContent = Array.isArray(node.content) ? renderChildren(node.content) : ''

    switch (node.type) {
      case 'heading':
        const level = node.attrs?.level || 1
        html += `<h${level} style="font-size: ${level === 1 ? '24px' : '20px'}; font-weight: bold; margin-top: 24px; margin-bottom: 12px; color: #111;">${textContent}</h${level}>`
        break
      case 'paragraph':
        html += `<p style="font-size: 16px; line-height: 1.6; margin-bottom: 16px; color: #333;">${textContent}</p>`
        break
      case 'blockquote':
        html += `<blockquote style="border-left: 4px solid #6366f1; padding-left: 16px; font-style: italic; margin: 16px 0; color: #555;">${textContent}</blockquote>`
        break
      case 'codeBlock':
        html += `<pre style="background: #f4f4f5; padding: 12px; border-radius: 6px; overflow-x: auto; margin-bottom: 16px;"><code style="font-family: monospace; font-size: 14px;">${textContent}</code></pre>`
        break
      case 'image':
        html += `<div style="margin: 20px 0; text-align: center;"><img src="${node.attrs?.src}" alt="${node.attrs?.alt || ''}" style="max-width: 100%; border-radius: 8px;" /></div>`
        break
      case 'horizontalRule':
        html += `<hr style="border: 0; border-top: 1px solid #eaeaea; margin: 24px 0;" />`
        break
      default:
        break
    }
  }

  return html
}
