import fs from 'fs-extra';
import path from 'path';

function extractBodyContent(html) {
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return bodyMatch ? bodyMatch[1] : html;
}

export async function buildPage(submissionId, files) {
  const dir = path.join('/tmp', `eval-${submissionId}`);
  await fs.ensureDir(dir);

  const assembled = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
${files.css || ''}
  </style>
</head>
<body>
${extractBodyContent(files.html || '')}
  <script>
${files.js || ''}
  </script>
</body>
</html>`;

  const filePath = path.join(dir, 'index.html');
  await fs.writeFile(filePath, assembled, 'utf-8');
  return { filePath, dir };
}

export async function cleanupPage(dir) {
  await fs.remove(dir);
}
