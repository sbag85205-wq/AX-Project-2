export const fetch = (url, options) => (globalThis.window?.knowlyTransport?.request ?? globalThis.fetch)(url, options);
