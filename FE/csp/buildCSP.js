import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Build CSP meta string from structured JSON configuration
 * @param {string} environment - The environment (development, staging,  production)
 * @returns {string} - The CSP meta string
 */
function buildCSP(environment = 'development') {
  try {
    const cspConfigPath = path.join(__dirname, `csp.${environment}.json`);
    const cspConfig = JSON.parse(fs.readFileSync(cspConfigPath, 'utf8'));

    if (!cspConfig.csp) {
      throw new Error('CSP configuration not found in the config file');
    }

    const cspDirectives = [];

    // Process each CSP directive
    Object.entries(cspConfig.csp).forEach(([directive, sources]) => {
      if (Array.isArray(sources) && sources.length > 0) {
        cspDirectives.push(`${directive} ${sources.join(' ')}`);
      }
    });

    const metaString = `${cspDirectives.join('; ')  };`;

    // Update the original file with the generated meta string
    const updatedConfig = {
      ...cspConfig,
      meta: metaString,
    };

    fs.writeFileSync(cspConfigPath, JSON.stringify(updatedConfig, null, 2));

    console.log(`✅ CSP meta string generated for ${environment}:`);
    console.log(metaString);

    return metaString;
  } catch (error) {
    console.error(`❌ Error building CSP for ${environment}:`, error.message);
    throw error;
  }
}

/**
 * Build CSP for all environments
 */
function buildAllCSP() {
  const environments = ['development', 'staging',  'production'];

  environments.forEach((env) => {
    const envConfigPath = path.join(__dirname, `csp.${env}.json`);
    if (fs.existsSync(envConfigPath)) {
      try {
        buildCSP(env);
      } catch (error) {
        console.error(`Failed to build CSP for ${env}:`, error.message);
      }
    } else {
      console.warn(`⚠️  CSP config not found for ${env}`);
    }
  });
}

// CLI usage
const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  const environment = process.argv[2] || 'all';

  if (environment === 'all') {
    buildAllCSP();
  } else {
    buildCSP(environment);
  }
}

export { buildCSP, buildAllCSP };
