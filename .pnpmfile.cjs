function readPackage(pkg) {
  // Allow these packages to run build scripts
  if (pkg.name === '@tailwindcss/oxide' ||
      pkg.name === 'bufferutil' ||
      pkg.name === 'keccak' ||
      pkg.name === 'sharp' ||
      pkg.name === 'unrs-resolver' ||
      pkg.name === 'utf-8-validate') {
    pkg.scripts = pkg.scripts || {};
  }
  return pkg;
}

module.exports = {
  hooks: {
    readPackage
  }
};