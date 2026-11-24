import { readFileSync } from 'node:fs';
import { defineConfig } from 'vite';
import tailwindcss from '@tailwindcss/vite';

const sitePartials = {
  name: 'site-partials',
  transformIndexHtml: {
    order: 'pre',
    handler(html) {
      return html.replace(
        /^([ \t]*)<!-- include:([a-z-]+) -->$/gm,
        (_, indent, name) =>
          readFileSync(
            new URL(`./src/partials/${name}.html`, import.meta.url),
            'utf8',
          )
            .trimEnd()
            .replace(/^/gm, indent),
      );
    },
  },
};

export default defineConfig({
  base: '/rkccleaners/',
  plugins: [sitePartials, tailwindcss()],
  build: {
    rolldownOptions: {
      input: [
        'index.html',
        'services/index.html',
        'quality-commitment/index.html',
        'testimonials/index.html',
        'contact/index.html',
        'thank-you/index.html',
        'reviews/index.html',
        'v2/index.html',
        'exploration/v1/index.html',
        'exploration/v1/reviews/index.html',
        'exploration/v2/index.html',
        'exploration/v2/layout/index.html',
        'exploration/v2/reviews/index.html',
        'exploration/v2/contact/index.html',
        'exploration/v2/thank-you/index.html',
      ],
    },
  },
});
