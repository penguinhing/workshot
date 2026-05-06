const fs = require('fs');
const path = require('path');
const PELibrary = require('pe-library');
const ResEdit = require('resedit');

function patchExeIcon(exePath, iconPath) {
  if (!fs.existsSync(exePath)) {
    throw new Error(`Executable not found: ${exePath}`);
  }
  if (!fs.existsSync(iconPath)) {
    throw new Error(`Icon not found: ${iconPath}`);
  }

  const exe = PELibrary.NtExecutable.from(fs.readFileSync(exePath), { ignoreCert: true });
  const resources = PELibrary.NtExecutableResource.from(exe);
  const iconFile = ResEdit.Data.IconFile.from(fs.readFileSync(iconPath));
  const iconGroups = ResEdit.Resource.IconGroupEntry.fromEntries(resources.entries);
  const targetGroup = iconGroups[0];

  ResEdit.Resource.IconGroupEntry.replaceIconsForResource(
    resources.entries,
    targetGroup?.id ?? 1,
    targetGroup?.lang ?? 1033,
    iconFile.icons.map((item) => item.data),
  );

  resources.outputResource(exe);

  const patched = Buffer.from(exe.generate());
  const tempPath = `${exePath}.icon-patch`;
  fs.writeFileSync(tempPath, patched);
  fs.copyFileSync(tempPath, exePath);
  fs.unlinkSync(tempPath);
}

async function afterPack(context) {
  if (context.electronPlatformName !== 'win32') return;

  const appInfo = context.packager.appInfo;
  const exeName = `${appInfo.productFilename || appInfo.productName}.exe`;
  const exePath = path.join(context.appOutDir, exeName);
  const iconPath = path.join(context.packager.projectDir, 'icon.ico');

  patchExeIcon(exePath, iconPath);
  console.log(`[workshot] patched executable icon: ${exePath}`);
}

module.exports = afterPack;
module.exports.patchExeIcon = patchExeIcon;

if (require.main === module) {
  const exePath = process.argv[2] || path.join(process.cwd(), 'dist', 'win-unpacked', 'WorkShot.exe');
  const iconPath = process.argv[3] || path.join(process.cwd(), 'icon.ico');
  patchExeIcon(exePath, iconPath);
  console.log(`[workshot] patched executable icon: ${exePath}`);
}
