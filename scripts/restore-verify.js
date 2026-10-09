const fs=require('node:fs'),path=require('node:path'),os=require('node:os');const {DatabaseSync}=require('node:sqlite');
const source=path.resolve(process.argv[2]||'');if(!fs.existsSync(source))throw Error('Backup file not found');
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'sales-restore-check-')),copy=path.join(dir,'restored.db');fs.copyFileSync(source,copy);
const db=new DatabaseSync(copy);const integrity=db.prepare('PRAGMA integrity_check').get().integrity_check;const migrations=db.prepare("SELECT count(*) n FROM sqlite_master WHERE type='table' AND name='schema_migrations'").get().n;db.close();fs.rmSync(dir,{recursive:true,force:true});
if(integrity!=='ok')throw Error('Restore integrity failed');console.log(JSON.stringify({source,isolated:true,integrity,migrations}));
