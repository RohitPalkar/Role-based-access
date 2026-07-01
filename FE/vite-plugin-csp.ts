import fs from 'fs';
import path from 'path';
import { Plugin } from 'vite';

interface CSPConfig {
  meta: string;
  links: string[];
}

export default function cspPlugin(env: string): Plugin {
  return {
    name: 'vite-plugin-csp',
    transformIndexHtml(html: string, ctx) {
      // Skip during development server - only apply during build
      if (ctx.server) {
        return html;
      }

      // Normalize environment name
      const normalizedEnv = env === 'prod' ? 'production' : 
                           env === 'dev' ? 'development' : 
                           env === 'stage' ? 'staging' : env;
      
      const configPath = path.resolve(__dirname, `./csp/csp.${normalizedEnv}.json`);

      if (!fs.existsSync(configPath)) {
        console.warn(`CSP config not found for ${normalizedEnv} at ${configPath}`);
        return html;
      }

      try {
        const { meta, links }: CSPConfig = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
        const metaTag = `<meta http-equiv="Content-Security-Policy" content="${meta}">`;
        const linkTags = links.join('\n    ');

        return html.replace(
          /<head>/,
          `<head>\n    ${metaTag}\n    ${linkTags}`
        );
      } catch (error) {
        console.error(`Error processing CSP config for ${normalizedEnv}:`, error);
        return html;
      }
    },
    apply: 'build' // Make sure it only applies during build
  };
} 