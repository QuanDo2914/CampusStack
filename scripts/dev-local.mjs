import {spawn} from 'node:child_process';
const children=[];let ending=false;
function run(file,args=[],env={}){const c=spawn(process.execPath,[file,...args],{stdio:'inherit',env:{...process.env,...env}});children.push(c);c.on('exit',()=>{if(!ending)stop();});return c;}
function stop(){ending=true;for(const c of children)c.kill('SIGTERM');}
process.on('SIGINT',stop);process.on('SIGTERM',stop);
run('tests/local-server.mjs');run('node_modules/vite/bin/vite.js',['--host','0.0.0.0'],{VITE_LOCAL_SERVER_URL:'http://localhost:8787'});
