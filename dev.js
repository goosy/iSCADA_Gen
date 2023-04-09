import { convert, context } from './src/index.js';
import mri from 'mri';

const argv = mri(process.argv.slice(2), {
    boolean: ['help', 'version'],
    alias: {
        H: 'help',
        V: 'version',
        Z: ['z', 'zyml-only'],
    }
});
const output_zyml = argv['zyml-only'] || argv['output-zyml'];
const noconvert = argv['zyml-only'];
process.chdir('./example');
context.work_path = process.cwd().replace(/\\/g, '/');
await convert({ output_zyml, noconvert });
if (!noconvert) console.log("\nconverted all YAML to resources!")