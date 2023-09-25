import test from 'ava'
import {extract} from '../extract.js'

const sampleTree = [
  {
    name: 'file1.jp2',
    isDirectory: false,
    fullPath: '/file1.jp2',
    size: 123,
    rawModifiedAt: 'Sep 20 09:16'
  },
  {
    name: 'folder1',
    isDirectory: true,
    children: [
      {
        name: 'file2.tiff',
        isDirectory: false,
        fullPath: '/folder1/file2.tiff',
        size: 456,
        rawModifiedAt: 'Sep 20 09:16'
      },
      {
        name: 'file3.txt',
        isDirectory: false,
        fullPath: '/folder1/file3.txt',
        size: 78,
        rawModifiedAt: 'Sep 20 09:16'
      },
      {
        name: 'folder2',
        isDirectory: true,
        fullPath: '/folder1/folder2',
        children: [
          {
            name: 'folder3',
            isDirectory: true,
            fullPath: '/folder1/folder2/folder3',
            children: [
              {
                name: 'file4.tiff',
                isDirectory: false,
                fullPath: '/folder1/folder2/folder3/file4.tiff',
                size: 789,
                rawModifiedAt: 'Sep 20 09:16'
              },
              {
                name: 'file5.geotiff',
                isDirectory: false,
                fullPath: '/folder1/folder2/folder3/file5.geotiff',
                size: 478,
                rawModifiedAt: 'Sep 20 09:16'
              }
            ]
          }
        ]
      }
    ]
  }
]

test('extract / 4 files', t => {
  const result = extract(sampleTree)

  t.deepEqual(result, [
    {
      fullPath: '/file1.jp2',
      size: 123,
      rawModifiedAt: 'Sep 20 09:16'
    },
    {
      fullPath: '/folder1/file2.tiff',
      size: 456,
      rawModifiedAt: 'Sep 20 09:16'
    },
    {
      fullPath: '/folder1/folder2/folder3/file4.tiff',
      size: 789,
      rawModifiedAt: 'Sep 20 09:16'
    },
    {
      fullPath: '/folder1/folder2/folder3/file5.geotiff',
      size: 478,
      rawModifiedAt: 'Sep 20 09:16'
    }
  ])
})

test('extract / emptyTree', t => {
  const emptyTree = []

  const result = extract(emptyTree)

  t.deepEqual(result, [])
})

test('extract / 0 file', t => {
  const treeWithOnlyFolders = [
    {
      name: 'folder1',
      fullPath: '/folder1',
      children: [
        {
          name: 'subfolder1',
          fullPath: '/folder1/subfolder1'
        },
        {
          name: 'subfolder2',
          fullPath: '/folder1/subfolder2'
        }
      ]
    }
  ]

  const result = extract(treeWithOnlyFolders)

  t.deepEqual(result, [])
})
