import {omit} from 'lodash-es'

export function flattenTree(node) {
  if (node.type === 'file') {
    const parentDirectory = node.fullPath.slice(0, -node.name.length)
    return [{...node, parentDirectory}]
  }

  if (node.type === 'directory') {
    const items = [omit(node, 'children')]

    for (const child of node.children) {
      items.push(...flattenTree(child))
    }

    return items
  }
}
