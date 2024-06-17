/**
 * @param {{
 *  paths: Array<{from: string, to: string}>
 *  forceCopyOnRebuild?: boolean
 * }} options
 * @returns {Plugin}
 */
export default function copyPlugin(options: {
    paths: Array<{
        from: string;
        to: string;
    }>;
    forceCopyOnRebuild?: boolean;
}): Plugin;
export type Plugin = import("esbuild").Plugin;
