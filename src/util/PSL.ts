import { domainToASCII } from 'node:url'

const ruleReq = await fetch('https://publicsuffix.org/list/public_suffix_list.dat');
const ruleText = await ruleReq.text();

const normalizeRule = (rule: string) => {
    if (rule.startsWith('!')) return '!' + domainToASCII(rule.slice(1));
    if (rule.startsWith('*.')) return '*.' + domainToASCII(rule.slice(2));

    return domainToASCII(rule);
}

const rules = new Set()
for (const line of ruleText.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//')) continue;
    rules.add(normalizeRule(trimmed));
}

const getPublicSuffix = (hostname: string) => {
    const labels = hostname.split('.');
    let matchedSuffix = null;
    let matchedLabelCount = 0;

    for (let i = 0; i < labels.length; i++) {
        const candidate = labels.slice(i).join('.');
        const exceptionCandidate = '!' + candidate;
        const wildcardCandidate = '*.' + labels.slice(i + 1).join('.');

        if (rules.has(exceptionCandidate)) {
            if (labels.length - i > matchedLabelCount) {
                matchedLabelCount = labels.length - (i + 1);
                matchedSuffix = labels.slice(i + 1).join('.');
            }

            continue;
        }

        if (rules.has(candidate) && labels.length - i > matchedLabelCount) {
            matchedLabelCount = labels.length - i;
            matchedSuffix = candidate;
        }

        if (rules.has(wildcardCandidate) && labels.length - i > matchedLabelCount) {
            matchedLabelCount = labels.length - i
            matchedSuffix = candidate
        }
    }

    if (matchedSuffix === null) return { suffix: labels[labels.length - 1], labelCount: 1 }
    return { suffix: matchedSuffix, labelCount: matchedLabelCount }
}

const getRegistrableDomain = (input: string) => {
    if (input === null || input === undefined) return null;

    const original = String(input).toLowerCase()
    if (original.startsWith('.') || original.endsWith('.')) return null
    if (original.includes('..')) return null
    const asciiHostname = domainToASCII(original)

    const originalLabels = original.split('.')
    const { labelCount } = getPublicSuffix(asciiHostname)
    const sldIndex = originalLabels.length - labelCount - 1

    if (sldIndex < 0) return null
    return originalLabels.slice(sldIndex).join('.')
}

const getPSL = (input: string) => ({
    prefix: getRegistrableDomain(input),
    suffix: getPublicSuffix(input)
});

export default getPSL;