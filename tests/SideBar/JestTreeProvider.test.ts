jest.unmock('../../src/SideBar/JestTreeProvider')
jest.unmock('../../src/SideBar/JestTreeNode')
jest.unmock('../../src/SideBar/TestResultTree')

jest.mock('vscode', () => {
  const vscode = {
    TreeDataProvider: class {
      constructor() {}
    },
    TreeItem: class {
      constructor(public label: string, public collapsibleState?: vscode.TreeItemCollapsibleState) {}
    },
    EventEmitter: jest.fn(() => {
      return {
        fire: jest.fn(),
      }
    }),
    TreeItemCollapsibleState: jest.fn<vscode.TreeItemCollapsibleState>(),
  }

  return vscode
})

import * as vscode from 'vscode'

import { JestTreeProvider } from '../../src/SideBar/JestTreeProvider'
import { JestTotalResults, JestFileResults } from '../../node_modules/jest-editor-support'
import { JestTreeNode } from '../../src/SideBar/JestTreeNode'
import { TestResultProvider } from '../../src/TestResults'

const testResultProvider = jest.fn<TestResultProvider>(() => {
  return {
    getResults: jest.fn(() => []),
  }
})()

const extensionContext = jest.fn<vscode.ExtensionContext>(() => {
  return {
    asAbsolutePath: jest.fn(),
  }
})()

describe('JestTreeProvider', () => {
  type NodeMock = { label: string; status?: string; children?: NodeMock[] }

  it('should initialize with empty tree', () => {
    const provider = new JestTreeProvider(testResultProvider, extensionContext, {
      autoExpand: true,
      showFiles: false,
    })

    expectTree(provider, [{ label: 'Tests' }])
  })

  it('should refresh with test results', () => {
    const provider = new JestTreeProvider(testResultProvider, extensionContext, {
      autoExpand: true,
      showFiles: false,
    })

    const results: JestTotalResults = jest.fn<JestTotalResults>(() => {
      return {
        testResults: [
          jest.fn<JestFileResults>(() => {
            return {
              name: 'file1',
              assertionResults: [
                {
                  title: 'test1',
                  status: 'pending',
                  ancestorTitles: ['desc1'],
                },
                {
                  title: 'test2',
                  status: 'passed',
                  ancestorTitles: ['desc1', 'desc2'],
                },
                {
                  title: 'test3',
                  status: 'failed',
                  ancestorTitles: ['desc1', 'desc2'],
                  failureMessages: ['failure message 1', 'failure message 2'],
                },
              ],
            }
          })(),
        ],
      }
    })()

    provider.refresh(results)

    expectTree(provider, [
      {
        label: 'Tests',
        children: [
          {
            label: 'desc1',
            children: [
              {
                label: 'desc2',
                children: [{ label: 'test2' }, { label: 'test3' }],
              },
              { label: 'test1' },
            ],
          },
        ],
      },
    ])
  })

  it('should clear tree', () => {
    const provider = new JestTreeProvider(testResultProvider, extensionContext, {
      autoExpand: true,
      showFiles: false,
    })

    const results: JestTotalResults = jest.fn<JestTotalResults>(() => {
      return {
        testResults: [
          jest.fn<JestFileResults>(() => {
            return {
              name: 'file1',
              assertionResults: [
                {
                  title: 'test1',
                  status: 'pending',
                  ancestorTitles: ['desc1'],
                },
              ],
            }
          })(),
        ],
      }
    })()

    provider.refresh(results)
    provider.clear()

    expectTree(provider, [{ label: 'Tests' }])
  })

  it('should update with partial test results', () => {
    const provider = new JestTreeProvider(testResultProvider, extensionContext, {
      autoExpand: true,
      showFiles: false,
    })

    const results: JestTotalResults = jest.fn<JestTotalResults>(() => {
      return {
        testResults: [
          jest.fn<JestFileResults>(() => {
            return {
              name: 'file1',
              assertionResults: [
                {
                  title: 'test1',
                  status: 'pending',
                  ancestorTitles: ['desc1'],
                },
              ],
            }
          })(),
          jest.fn<JestFileResults>(() => {
            return {
              name: 'file2',
              assertionResults: [
                {
                  title: 'test2',
                  status: 'failed',
                  ancestorTitles: ['desc2', 'desc3'],
                },
              ],
            }
          })(),
        ],
      }
    })()

    const partialResults: JestTotalResults = jest.fn<JestTotalResults>(() => {
      return {
        testResults: [
          jest.fn<JestFileResults>(() => {
            return {
              name: 'file2',
              assertionResults: [
                {
                  title: 'test2',
                  status: 'passed',
                  ancestorTitles: ['desc2', 'desc3'],
                },
                {
                  title: 'test3',
                  status: 'failed',
                  ancestorTitles: ['desc2', 'desc3'],
                  failureMessages: ['failure message 1', 'failure message 2'],
                },
              ],
            }
          })(),
        ],
      }
    })()

    provider.refresh(results)
    provider.refresh(partialResults)

    expectTree(provider, [
      {
        label: 'Tests',
        children: [
          {
            label: 'desc1',
            children: [{ label: 'test1' }],
          },
          {
            label: 'desc2',
            children: [
              {
                label: 'desc3',
                children: [{ label: 'test2', status: 'passed' }, { label: 'test3' }],
              },
            ],
          },
        ],
      },
    ])
  })

  const expectTree = (provider: JestTreeProvider, tree: NodeMock[]) => {
    expectTreeChildren(provider, provider.getChildren(), tree)
  }

  const expectTreeChildren = (provider: JestTreeProvider, children: JestTreeNode[], tree: NodeMock[]) => {
    expect(children).toMatchObject(
      tree.map(n => (n.status ? { label: n.label, status: n.status } : { label: n.label }))
    )
    // expect(children).toMatchObject(tree.map(n => Object.assign(n, { children: undefined })))
    tree.forEach((n, i) => {
      if (n.children !== undefined) {
        expectTreeChildren(provider, provider.getChildren(children[i]), n.children)
      }
    })
  }

  describe('getTreeItem', () => {
    it('should get tree item', () => {
      const provider = new JestTreeProvider(testResultProvider, extensionContext, {
        autoExpand: true,
        showFiles: false,
      })

      const element = jest.fn<JestTreeNode>()()

      expect(provider.getTreeItem(element)).toBe(element)
    })
  })
})
