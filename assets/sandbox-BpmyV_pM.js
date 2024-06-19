import{e as l}from"./index-BoyE9Fwc.js";const{DISALLOWED:d}=l;class a{constructor(e,t){this.writer=e,this.fileEntry=t}async write(e){if(typeof e=="object"){if(e.type==="write"){if(Number.isInteger(e.position)&&e.position>=0&&(this.writer.seek(e.position),this.writer.position!==e.position&&(await new Promise((t,i)=>{this.writer.onwriteend=t,this.writer.onerror=i,this.writer.truncate(e.position)}),this.writer.seek(e.position))),!("data"in e))throw new DOMException("Failed to execute 'write' on 'UnderlyingSinkBase': Invalid params passed. write requires a data argument","SyntaxError");e=e.data}else if(e.type==="seek")if(Number.isInteger(e.position)&&e.position>=0){if(this.writer.seek(e.position),this.writer.position!==e.position)throw new DOMException("seeking position failed","InvalidStateError");return}else throw new DOMException("Failed to execute 'write' on 'UnderlyingSinkBase': Invalid params passed. seek requires a position argument","SyntaxError");else if(e.type==="truncate")return new Promise(t=>{if(Number.isInteger(e.size)&&e.size>=0)this.writer.onwriteend=i=>t(),this.writer.truncate(e.size);else throw new DOMException("Failed to execute 'write' on 'UnderlyingSinkBase': Invalid params passed. truncate requires a size argument","SyntaxError")})}await new Promise((t,i)=>{this.writer.onwriteend=t,this.writer.onerror=i,this.writer.write(new Blob([e]))})}close(){return new Promise(this.fileEntry.file.bind(this.fileEntry))}}class w{constructor(e,t=!0){this.file=e,this.kind="file",this.writable=t,this.readable=!0}get name(){return this.file.name}isSameEntry(e){return this.file.toURL()===e.file.toURL()}getFile(){return new Promise(this.file.file.bind(this.file))}createWritable(e){if(!this.writable)throw new DOMException(...d);return new Promise((t,i)=>this.file.createWriter(r=>{e.keepExistingData===!1?(r.onwriteend=s=>t(new a(r,this.file)),r.truncate(0)):t(new a(r,this.file))},i))}}class n{constructor(e,t=!0){this.dir=e,this.writable=t,this.readable=!0,this.kind="directory",this.name=e.name}isSameEntry(e){return this.dir.fullPath===e.dir.fullPath}async*entries(){const e=this.dir.createReader(),t=await new Promise(e.readEntries.bind(e));for(const i of t)yield[i.name,i.isFile?new w(i,this.writable):new n(i,this.writable)]}getDirectoryHandle(e,t){return new Promise((i,r)=>{this.dir.getDirectory(e,t,s=>{i(new n(s))},r)})}getFileHandle(e,t){return new Promise((i,r)=>this.dir.getFile(e,t,s=>i(new w(s)),r))}async removeEntry(e,t){const i=await this.getDirectoryHandle(e,{create:!1}).catch(r=>r.name==="TypeMismatchError"?this.getFileHandle(e,{create:!1}):r);if(i instanceof Error)throw i;return new Promise((r,s)=>{i instanceof n?t.recursive?i.dir.removeRecursively(()=>r(),s):i.dir.remove(()=>r(),s):i.file&&i.file.remove(()=>r(),s)})}}const m=(o={})=>new Promise((e,t)=>window.webkitRequestFileSystem(o._persistent,0,i=>e(new n(i.root)),t));export{w as FileHandle,n as FolderHandle,m as default};
