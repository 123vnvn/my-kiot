const fs=require('node:fs'),path=require('node:path');
const {DatabaseSync}=require('node:sqlite');
const source=path.resolve(process.argv[2]||path.join(__dirname,'..','data','sales.db'));
const out=path.resolve(process.argv[3]||path.join(__dirname,'..','backups','manual-'+new Date().toISOString().replace(/[:.]/g,'-')+'.db'));
fs.mkdirSync(path.dirname(out),{recursive:true});if(fs.existsSync(out))throw Error('Refusing to overwrite '+out);
const db=new DatabaseSync(source);db.exec("VACUUM INTO '"+out.replaceAll("'","''")+"'");const integrity=db.prepare('PRAGMA integrity_check').get().integrity_check;db.close();
const copy=new DatabaseSync(out,{readOnly:true});const restored=copy.prepare('PRAGMA integrity_check').get().integrity_check;copy.close();
if(integrity!=='ok'||restored!=='ok')throw Error('Integrity verification failed');console.log(JSON.stringify({source,out,integrity,restored}));
