import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const contentRoot = path.join(root, 'content');
const outputFile = path.join(root, 'src/generated/content.generated.ts');

function parseValue(raw) {
  const value = raw.trim();
  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value.startsWith('[') && value.endsWith(']')) return JSON.parse(value);
  if (value.startsWith('"') && value.endsWith('"')) return JSON.parse(value);
  if (/^-?\d+$/.test(value)) return Number(value);
  return value;
}

function parseFrontmatter(source) {
  if (!source.startsWith('---\n')) {
    return { data: {}, content: source.trim() };
  }

  const endIndex = source.indexOf('\n---\n', 4);
  if (endIndex === -1) {
    return { data: {}, content: source.trim() };
  }

  const frontmatterBlock = source.slice(4, endIndex).trim();
  const content = source.slice(endIndex + 5).trim();
  const data = {};

  for (const line of frontmatterBlock.split('\n')) {
    const separator = line.indexOf(':');
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim();
    const rawValue = line.slice(separator + 1);
    data[key] = parseValue(rawValue);
  }

  return { data, content };
}

function readRecords(folder) {
  const dir = path.join(contentRoot, folder);
  const files = fs.existsSync(dir)
    ? fs.readdirSync(dir).filter((file) => file.endsWith('.mdx')).sort()
    : [];

  return files.map((file) => {
    const fullPath = path.join(dir, file);
    const raw = fs.readFileSync(fullPath, 'utf8');
    const parsed = parseFrontmatter(raw);
    return {
      frontmatter: parsed.data,
      content: parsed.content
    };
  });
}

const projectRecords = readRecords('projects');
const blogRecords = readRecords('blog');
const source = `/* eslint-disable */\nexport const projectRecords = ${JSON.stringify(projectRecords, null, 2)} as const;\n\nexport const blogRecords = ${JSON.stringify(blogRecords, null, 2)} as const;\n`;

fs.writeFileSync(outputFile, source);
console.log(`Generated content: ${projectRecords.length} projects, ${blogRecords.length} blog posts`);
