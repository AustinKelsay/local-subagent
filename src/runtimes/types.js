/**
 * @typedef {object} RuntimeLaunchSpec
 * @property {string} command
 * @property {string[]} args
 * @property {Record<string, string | undefined>=} env
 *
 * @typedef {object} RuntimeBuildContext
 * @property {string} cwd
 * @property {string} outDir
 * @property {string} taskFile
 * @property {string} taskText
 * @property {string=} model
 * @property {number=} timeoutSeconds
 * @property {NodeJS.ProcessEnv} env
 */

/**
 * @template T
 * @param {T} adapter
 * @returns {T}
 */
export function defineRuntimeAdapter(adapter) {
  return adapter;
}
