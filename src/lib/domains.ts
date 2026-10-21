export type DomainTarget = 'github' | 'vercel' | 'netlify' | 'cloudflare';

export interface DnsRecord {
  type: 'A' | 'CNAME' | 'ALIAS' | 'TXT';
  name: string;
  value: string;
  note?: string;
}

export interface DomainGuide {
  target: DomainTarget;
  label: string;
  /** Where the project is hosted, in one line. */
  summary: string;
  records: DnsRecord[];
  docsUrl: string;
  /** Extra caveats a static, client-side builder should be honest about. */
  notes: string[];
}

/**
 * Cleans what people actually paste: full URLs, paths, capitals, a trailing
 * slash, a trailing dot, or a www prefix.
 */
export function normalizeDomain(input: string): string | null {
  let value = input.trim().toLowerCase();
  if (!value) return null;

  value = value.replace(/^https?:\/\//, '');
  value = value.split('/')[0];
  value = value.split('?')[0];
  value = value.split('#')[0];
  value = value.replace(/\.$/, '');
  value = value.replace(/^www\./, '');

  if (!isValidDomain(value)) return null;
  return value;
}

export function isValidDomain(value: string): boolean {
  if (value.length < 4 || value.length > 253) return false;

  const labels = value.split('.');
  if (labels.length < 2) return false;

  for (const label of labels) {
    if (label.length === 0 || label.length > 63) return false;
    if (!/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/i.test(label)) return false;
  }

  // The final label must be a real-looking TLD, not a number.
  return /^[a-z]{2,}$/i.test(labels[labels.length - 1]);
}

/** A GitHub Pages project site is served from this host. */
export function githubPagesHost(owner: string, repo: string): string {
  return `${owner.toLowerCase()}.github.io/${repo}`;
}

/**
 * The records a visitor needs to add at their DNS provider.
 *
 * The app cannot edit DNS records: that happens at the registrar. It can,
 * however, tell you exactly what to enter and ship the CNAME file GitHub Pages
 * needs, which is the part people usually get wrong.
 */
export function domainGuide(
  domain: string,
  target: DomainTarget,
  options: { githubOwner?: string } = {},
): DomainGuide {
  if (target === 'vercel') {
    return {
      target,
      label: 'Vercel',
      summary: `Deploy first, then add ${domain} in Vercel → Project → Settings → Domains.`,
      records: [
        { type: 'A', name: '@', value: '76.76.21.21' },
        {
          type: 'CNAME',
          name: 'www',
          value: 'cname.vercel-dns.com',
          note: 'Or use the domain Vercel shows after you add it.',
        },
      ],
      docsUrl: 'https://vercel.com/docs/domains/working-with-domains/add-a-domain',
      notes: [
        'Vercel issues and renews the HTTPS certificate automatically once DNS resolves.',
        'For this builder, put the same domain in the field above so the exported CNAME stays accurate.',
      ],
    };
  }

  if (target === 'netlify') {
    return {
      target,
      label: 'Netlify',
      summary: `Add ${domain} in Netlify → Domain management, then point DNS at the site.`,
      records: [
        {
          type: 'CNAME',
          name: 'www',
          value: 'your-site.netlify.app',
          note: 'Replace with the site subdomain Netlify shows.',
        },
        {
          type: 'ALIAS',
          name: '@',
          value: 'your-site.netlify.app',
          note: 'Netlify recommends an ALIAS/ANAME record at the apex. A CNAME at @ only works with DNS flattening.',
        },
      ],
      docsUrl: 'https://docs.netlify.com/domains-https/custom-domains/configure-external-dns/',
      notes: ['Netlify provisions a Let’s Encrypt certificate after the records resolve.'],
    };
  }

  if (target === 'cloudflare') {
    return {
      target,
      label: 'Cloudflare Pages',
      summary: `Add ${domain} in Cloudflare Pages, then let Cloudflare manage the record.`,
      records: [
        {
          type: 'CNAME',
          name: '@',
          value: 'your-project.pages.dev',
          note: 'Cloudflare flattens a CNAME at the apex automatically.',
        },
        {
          type: 'CNAME',
          name: 'www',
          value: 'your-project.pages.dev',
          note: 'Replace with the pages.dev host shown in your project.',
        },
      ],
      docsUrl: 'https://developers.cloudflare.com/pages/configuration/custom-domains/',
      notes: [
        'If the domain is already on Cloudflare, the record can be created for you.',
        'Certificates are issued automatically.',
      ],
    };
  }

  const owner = options.githubOwner?.trim() || 'your-username';
  return {
    target: 'github',
    label: 'GitHub Pages',
    summary: `The CNAME for ${domain} is included in downloads and GitHub pushes. Add these records at your DNS provider.`,
    records: [
      ...['185.199.108.153', '185.199.109.153', '185.199.110.153', '185.199.111.153'].map(
        (value): DnsRecord => ({ type: 'A', name: '@', value }),
      ),
      {
        type: 'CNAME',
        name: 'www',
        value: `${owner.toLowerCase()}.github.io`,
        note: 'Use the host from your GitHub Pages settings.',
      },
    ],
    docsUrl: 'https://docs.github.com/en/pages/configuring-a-custom-domain-for-your-github-pages-site',
    notes: [
      'A CNAME file in the repository tells GitHub Pages which domain to serve.',
      'Enable “Enforce HTTPS” in the repository’s Pages settings after DNS resolves.',
      'The token needs the repo scope. Pages must be enabled for the repository.',
    ],
  };
}

/** GitHub Pages reads this file from the root of the published branch. */
export function cnameFile(domain: string): string {
  return `${domain}\n`;
}
