import * as path from "https://deno.land/std/path/mod.ts";

function getModuleDir(importMeta: ImportMeta): string {
  return path.resolve(path.dirname(path.fromFileUrl(importMeta.url)));
}

function toAbsolute(p: string) {
  return p[0] === '/' ? p :  path.normalize(path.join(Deno.cwd(), p));
}

const dir = getModuleDir(import.meta);

 // todo: use quarto to find _quarto.yml and read outputDir from it
const projectDir = path.normalize(path.join(dir, '..'));
const outputDir = '_site';

const args = Deno.args;
if(args.length < 2 || args[0] == '-h') {
  console.error('usage: quarto run snapshot.typst.ts source.qmd dest.png')
  console.error('  source and dest paths can be absolute or relative but must be within a quarto project')
  Deno.exit(1)
}
const sourcePath = toAbsolute(args[0]),
  destPath = toAbsolute(args[1]);
if(!sourcePath.startsWith(projectDir)) {
  console.error('source path', sourcePath, 'is not within quarto project dir', projectDir);
  Deno.exit(1);
}
if(!destPath.startsWith(projectDir)) {
  console.error('dest path', destPath, 'is not within quarto project dir', projectDir);
  Deno.exit(1);
}

const relSourcePath = sourcePath.slice(projectDir.length + 1);
const dryRun = false;
const qcmd = [
  'render',
  args[0],
  '-M',
  'echo:false',
  '-M',
  'warning:false',
  '-M',
  'title:false'
];
console.log('quarto', ...qcmd);
if (!dryRun) {
  const cmd = new Deno.Command('quarto', {
      args: qcmd
  });
  const output = await cmd.output();
  if (!output.success) {
      console.log(new TextDecoder().decode(output.stderr));
      Deno.exit(2);
  }
}

const absPdfPath = path.join(projectDir, outputDir, relSourcePath.replace(/qmd$/, 'pdf')),
  relPdfPath = path.relative('.', absPdfPath); // for readability

const mcmd = [
  'convert',
  '-verbose',
  '-density', 300,
  '-trim',
  '+repage',
  relPdfPath,
  '-quality', 100,
  '-flatten',
  '-units', 'PixelsPerInch',
  '-set', 'density', 300,
  args[1]
];

console.log('magick', ...mcmd);
if (!dryRun) {
  const cmd = new Deno.Command('magick', {
      args: mcmd
  });
  const output = await cmd.output();
  if (!output.success) {
      console.log(new TextDecoder().decode(output.stderr));
      Deno.exit(2);
  }
}
