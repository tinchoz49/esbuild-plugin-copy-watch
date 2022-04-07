/**
 * @param {Array<{from: string, to: string}>} userPaths
 * @returns {Plugin}
 */
export default function copyPlugin(userPaths?: Array<{
    from: string;
    to: string;
}>): Plugin;
export type Plugin = import("esbuild").Plugin;
