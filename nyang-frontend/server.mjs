// Compatibility entry point for the old static preview command.
import {spawn} from 'node:child_process';
const child=spawn(process.execPath,['scripts/run-framework.mjs','dev','--port','4173','--hostname','127.0.0.1'],{stdio:'inherit'});
child.on('exit',code=>process.exit(code??1));
