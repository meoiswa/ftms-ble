/**
 * Plugin registration file.
 *
 * Built-in plugins are registered here. To add a third-party plugin:
 *   1. Implement the FtmsPlugin interface from '../plugins/index'
 *   2. Import and add it to the array below
 *
 * Example:
 *   import { myPlugin } from 'my-ftms-plugin'
 *   export const plugins: FtmsPlugin[] = [tcxPlugin, myPlugin]
 */
import type { FtmsPlugin } from './index'
import { tcxPlugin } from './builtin/tcx'
import { dmasunPlugin } from './builtin/dmasun'

export const plugins: FtmsPlugin[] = [
  tcxPlugin,
  dmasunPlugin,
]
