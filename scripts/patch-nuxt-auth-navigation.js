const fs = require('node:fs');
const path = require('node:path');

function patchFirstMatch({ filePath, description, originals, patched }) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`No se encontró el archivo: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf8');

  if (content.includes(patched)) {
    console.log(`${description}: already applied.`);
    return;
  }

  const original = originals.find((candidate) => content.includes(candidate));

  if (!original) {
    throw new Error(
      `${description}: no se encontró ningún bloque compatible. La dependencia pudo haber cambiado.`
    );
  }

  fs.writeFileSync(filePath, content.replace(original, patched));
  console.log(`${description}: applied.`);
}

const nuxtAuthBase = path.join(
  process.cwd(),
  'node_modules',
  '@sidebase',
  'nuxt-auth',
  'dist',
  'runtime'
);

const authNavigationFile = path.join(
  nuxtAuthBase,
  'composables',
  'authjs',
  'utils',
  'navigateToAuthPage.js'
);

const originalAuthNavigation = `  window.location.href = href;
  if (href.includes("#")) {
    window.location.reload();
  }
  const waitForNavigationWithFallbackToRouter = new Promise((resolve) => setTimeout(resolve, 60 * 1e3)).then(() => router.push(href));
  return waitForNavigationWithFallbackToRouter;`;

const previousAuthNavigationPatch = `  window.location.href = href;
  if (href.includes("#")) {
    window.location.reload();
  }
  const waitForNavigationWithFallbackToRouter = new Promise((resolve) =>
    setTimeout(resolve, 60 * 1e3)
  ).then(() => {
    if (hasProtocol(href, { acceptRelative: true })) {
      window.location.replace(href);
      return;
    }

    return router.push(href);
  });
  return waitForNavigationWithFallbackToRouter;`;

const finalAuthNavigationPatch = `  if (hasProtocol(href, { acceptRelative: true })) {
    return router.replace("/").then(() => {
      window.location.assign(href);
      return false;
    });
  }

  window.location.href = href;
  if (href.includes("#")) {
    window.location.reload();
  }
  const waitForNavigationWithFallbackToRouter = new Promise((resolve) =>
    setTimeout(resolve, 60 * 1e3)
  ).then(() => router.push(href));
  return waitForNavigationWithFallbackToRouter;`;

patchFirstMatch({
  filePath: authNavigationFile,
  description: 'External authentication history patch',
  originals: [originalAuthNavigation, previousAuthNavigationPatch],
  patched: finalAuthNavigationPatch,
});

const authMiddlewareFile = path.join(nuxtAuthBase, 'middleware', 'sidebase-auth.js');

patchFirstMatch({
  filePath: authMiddlewareFile,
  description: 'Default unauthenticated destination patch',
  originals: ['      navigateUnauthenticatedTo: void 0'],
  patched: '      navigateUnauthenticatedTo: "/"',
});

patchFirstMatch({
  filePath: authMiddlewareFile,
  description: 'Configured unauthenticated destination fallback patch',
  originals: ['      navigateUnauthenticatedTo: userOptions.navigateUnauthenticatedTo'],
  patched: '      navigateUnauthenticatedTo: userOptions.navigateUnauthenticatedTo ?? "/"',
});

patchFirstMatch({
  filePath: authMiddlewareFile,
  description: 'Unauthenticated history replacement patch',
  originals: ['    return navigateTo(options.navigateUnauthenticatedTo);'],
  patched: '    return navigateTo(options.navigateUnauthenticatedTo, { replace: true });',
});

console.log('NuxtAuth navigation patches completed.');
