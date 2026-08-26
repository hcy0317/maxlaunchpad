import fs from 'fs';
import path from 'path';

describe('font family stylesheet contract', () => {
  it('applies the selected family to native controls and the bundled modern style', () => {
    const globalCss = fs.readFileSync(path.resolve(__dirname, '../styles/global.css'), 'utf8');
    const modernCss = fs.readFileSync(
      path.resolve(__dirname, '../../../resources/config-templates/styles/modern.css'),
      'utf8',
    );

    expect(globalCss).toMatch(
      /button,\s*input,\s*select,\s*textarea\s*{[\s\S]*?font-family:\s*var\(--app-font-family\)/,
    );
    expect(modernCss).toContain('--ml-font: var(--app-font-family);');
  });
});
