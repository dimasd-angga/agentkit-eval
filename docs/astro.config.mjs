import starlight from '@astrojs/starlight';
import { defineConfig } from 'astro/config';

export default defineConfig({
  site: 'https://agentkit-eval.dev',
  integrations: [
    starlight({
      title: 'agentkit-eval',
      description: 'Type-safe evals for AI agents. Score traces, not just outputs.',
      social: {
        github: 'https://github.com/dimasd-angga/agentkit-eval',
      },
      editLink: {
        baseUrl: 'https://github.com/dimasd-angga/agentkit-eval/edit/main/docs/',
      },
      sidebar: [
        {
          label: 'Start here',
          items: [
            { label: 'Why agentkit-eval', slug: 'why' },
            { label: 'Quickstart', slug: 'quickstart' },
          ],
        },
        {
          label: 'Scorers',
          items: [
            { label: 'Trace scorers', slug: 'scorers/trace' },
            { label: 'Output scorers', slug: 'scorers/output' },
            { label: 'Snapshots', slug: 'scorers/snapshots' },
          ],
        },
        {
          label: 'Workflows',
          items: [
            { label: 'Compare variants', slug: 'guides/compare' },
            { label: 'GitHub Action', slug: 'guides/github-action' },
          ],
        },
        {
          label: 'Recipes',
          autogenerate: { directory: 'recipes' },
        },
      ],
      customCss: ['./src/styles/theme.css'],
    }),
  ],
});
