import { describe, it, expect } from 'vitest';
import nextConfig from '../../next.config.mjs';

describe('next.config legacy HTML redirects', () => {
  it('redirects old static HTML entry points to their Next.js routes', async () => {
    expect(typeof nextConfig.redirects).toBe('function');

    const redirects = await nextConfig.redirects();

    expect(redirects).toEqual(expect.arrayContaining([
      expect.objectContaining({ source: '/index.html', destination: '/', permanent: true }),
      expect.objectContaining({ source: '/integration-by-parts.html', destination: '/integration-by-parts', permanent: true }),
      expect.objectContaining({ source: '/jarvis.html', destination: '/jarvis', permanent: true }),
      expect.objectContaining({ source: '/lessons.html', destination: '/lessons', permanent: true }),
      expect.objectContaining({ source: '/mindmap.html', destination: '/mindmap', permanent: true }),
      expect.objectContaining({ source: '/questions.html', destination: '/questions', permanent: true }),
      expect.objectContaining({ source: '/pricing.html', destination: '/pricing', permanent: true }),
      expect.objectContaining({ source: '/contact.html', destination: '/contact', permanent: true }),
    ]));
  });
});
