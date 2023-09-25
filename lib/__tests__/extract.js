import test from 'ava'
import {extract} from '../extract.js'

const sampleTree = [
  {
    name: 'file1.jp2',
    isDirectory: false
  },
  {
    name: 'folder1',
    isDirectory: true,
    children: [
      {
        name: 'file2.tiff',
        isDirectory: false
      },
      {
        name: 'file3.txt',
        isDirectory: false
      },
      {
        name: 'folder2',
        isDirectory: true,
        children: [
          {
            name: 'folder3',
            isDirectory: true,
            children: [
              {
                name: 'file4.tiff',
                isDirectory: false
              },
              {
                name: 'file5.geotiff',
                isDirectory: false
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
      name: 'file1.jp2',
      isDirectory: false
    },
    {
      name: 'file2.tiff',
      isDirectory: false
    },
    {
      name: 'file4.tiff',
      isDirectory: false
    },
    {
      name: 'file5.geotiff',
      isDirectory: false
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
      isDirectory: true,
      children: [
        {
          name: 'subfolder1',
          isDirectory: true
        },
        {
          name: 'subfolder2',
          isDirectory: true
        }
      ]
    }
  ]

  const result = extract(treeWithOnlyFolders)

  t.deepEqual(result, [])
})
