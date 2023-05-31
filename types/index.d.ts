/**
 * @param {{
 *  paths: Array<{from: string, to: string}>;
 * }} options
 * @returns {Plugin}
 */
export default function copyPlugin(options: {
    paths: Array<{
        from: string;
        to: string;
    }>;
}): Plugin;
export type Plugin = import("esbuild").Plugin;
