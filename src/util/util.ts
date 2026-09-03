export const fish = (url: string, options: RequestInit = {}) => {
    if (process.env.PROXY) (options as any).proxy = process.env.PROXY;
    return fetch(url, options);
}

export const toEST = (date: number, utcOffset: number): number => {
    const formatter = new Intl.DateTimeFormat('en-US', { timeZone: 'America/New_York', timeZoneName: 'shortOffset' });
    const parts = formatter.formatToParts(new Date(date));
    const offset = parts.find(p => p.type === 'timeZoneName')?.value;
    const estOffset = parseInt(offset?.replace('GMT', '') ?? '-5');
    const sourceMs = utcOffset * 60 * 60 * 1000;
    const targetMs = estOffset * 60 * 60 * 1000;
    return date - sourceMs + targetMs;
}