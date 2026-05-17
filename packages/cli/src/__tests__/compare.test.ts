import { describe, expect, it } from 'vitest';
import { renderCompareMarkdown } from '../commands/compare.js';

describe('renderCompareMarkdown', () => {
  it('renders a header, a row per variant, and one column per scorer', () => {
    const md = renderCompareMarkdown({
      evalName: 'rag-tool-use',
      scorers: ['toolOrder', 'toolsCalled'],
      cells: [
        {
          variant: 'fast',
          pass: 3,
          fail: 0,
          meanScores: { toolOrder: 1, toolsCalled: 1 },
        },
        {
          variant: 'cheap',
          pass: 2,
          fail: 1,
          meanScores: { toolOrder: 0.833, toolsCalled: 1 },
        },
      ],
    });
    expect(md).toContain('## rag-tool-use');
    expect(md).toContain('| variant | pass / fail | toolOrder | toolsCalled |');
    expect(md).toContain('| fast | 3 / 0 | 1.000 | 1.000 |');
    expect(md).toContain('| cheap | 2 / 1 | 0.833 | 1.000 |');
  });

  it('reports 0.000 for missing scorer cells', () => {
    const md = renderCompareMarkdown({
      evalName: 'partial',
      scorers: ['onlyOne'],
      cells: [{ variant: 'a', pass: 0, fail: 1, meanScores: {} }],
    });
    expect(md).toContain('| a | 0 / 1 | 0.000 |');
  });
});
