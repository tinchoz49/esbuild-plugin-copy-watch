/**
 * @param {Array<{from: string, to: string}>} userPaths
 * @returns {{name: string, setup: function }}
 */
export default function copyPlugin(userPaths?: Array<{
    from: string;
    to: string;
}>): {
    name: string;
    setup: Function;
};
