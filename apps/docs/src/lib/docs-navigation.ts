export interface DocsNavItem {
	title: string;
	slug: string;
}

export interface DocsNavGroup {
	title: string;
	items: DocsNavItem[];
}

export interface DocsSection {
	key: 'guide' | 'api' | 'ecosystem';
	title: string;
	landingSlug: string;
	groups: DocsNavGroup[];
}

export const docsSections: DocsSection[] = [
	{
		key: 'guide',
		title: 'Guide',
		landingSlug: 'getting-started/quickstart',
		groups: [
			{
				title: 'Introduction',
				items: [
					{ title: 'Getting Started', slug: 'getting-started/quickstart' },
					{ title: 'Why Flue?', slug: 'introduction/why-flue' },
				],
			},
			{
				title: 'Guide',
				items: [
					{ title: 'Agents', slug: 'concepts/agents' },
					{ title: 'Workflows', slug: 'guide/workflows' },
					{ title: 'Sandboxed compute', slug: 'guide/sandboxed-compute' },
					{ title: 'Durable execution', slug: 'guide/durable-execution' },
					{ title: 'Tools and skills', slug: 'guide/tools-and-skills' },
				],
			},
		],
	},
	{
		key: 'api',
		title: 'API',
		landingSlug: 'config/project-configuration',
		groups: [
			{
				title: 'Configuration',
				items: [
					{ title: 'Project configuration', slug: 'config/project-configuration' },
					{ title: 'Targets and output', slug: 'config/targets-and-output' },
				],
			},
			{
				title: 'API Reference',
				items: [{ title: 'Runtime API', slug: 'reference/runtime-api' }],
			},
		],
	},
	{
		key: 'ecosystem',
		title: 'Ecosystem',
		landingSlug: 'ecosystem/overview',
		groups: [
			{
				title: 'Ecosystem',
				items: [
					{ title: 'Overview', slug: 'ecosystem/overview' },
					{ title: 'Connectors', slug: 'ecosystem/connectors' },
				],
			},
			{
				title: 'Deployment',
				items: [{ title: 'Targets', slug: 'ecosystem/targets' }],
			},
		],
	},
];

export function docsHref(slug: string) {
	return `/${slug}/`;
}

export function getDocsSection(slug: string) {
	return docsSections.find((section) => section.groups.some((group) => group.items.some((item) => item.slug === slug))) ?? docsSections[0];
}

