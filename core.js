/* Kas Keluarga 2.0 — shared deterministic data rules. */
(function(root){
'use strict';
const kinds=['tx','category','account','goal','bill','budget'];
const idOK=x=>typeof x==='string'&&/^[a-zA-Z0-9_-]{1,90}$/.test(x);
const dateOK=x=>typeof x==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(x)&&!isNaN(Date.parse(x))&&new Date(x+'T00:00:00Z').toISOString().slice(0,10)===x;
function need(ok,msg){if(!ok)throw Error(msg);}
function money(x,zero=false){need(Number.isSafeInteger(x)&&(zero?x>=0:x>0)&&x<=1e12,'Nominal harus bilangan bulat positif maksimal Rp1 triliun.');}
function text(x,max=120){need(typeof x==='string'&&x.trim().length>0&&x.length<=max,'Teks kosong atau terlalu panjang.');}
function validate(kind,d){
 need(kinds.includes(kind)&&d&&typeof d==='object'&&!Array.isArray(d),'Jenis data tidak valid.');
 need(idOK(d.id),'ID tidak valid.');
 if(kind==='tx'){
  need(dateOK(d.tanggal),'Tanggal tidak valid.'); money(d.jumlah);
  need(['masuk','keluar','transfer','setor','tarik'].includes(d.jenis),'Jenis transaksi tidak valid.');
  need(idOK(d.accountId),'Akun wajib dipilih.');
  need(['Abi','Umi'].includes(d.oleh),'Pencatat tidak valid.');
  need(typeof d.catatan==='string'&&d.catatan.length<=1000,'Catatan maksimal 1.000 karakter.');
  need(Number.isSafeInteger(d.dibuatPada)&&d.dibuatPada>0,'Waktu pembuatan tidak valid.');
  if(['masuk','keluar'].includes(d.jenis))need(idOK(d.categoryId),'Kategori wajib dipilih.');
  else need(idOK(d.toAccountId)&&d.toAccountId!==d.accountId,'Akun asal dan tujuan harus berbeda.');
  if(['setor','tarik'].includes(d.jenis))need(idOK(d.goalId),'Tujuan tabungan wajib dipilih.');
  if(d.billId){need(d.jenis==='keluar'&&idOK(d.billId)&&/^\d{4}-(0[1-9]|1[0-2])$/.test(d.billPeriod||''),'Periode tagihan tidak valid.');}
 }else{
  if(kind!=='budget')text(d.name);
  if(kind==='category')need(['masuk','keluar'].includes(d.type),'Jenis kategori tidak valid.');
  if(kind==='account'){need(Number.isSafeInteger(d.initial)&&Math.abs(d.initial)<=1e12,'Saldo awal tidak valid.');need(dateOK(d.startDate),'Tanggal saldo awal wajib valid.');}
  if(kind==='goal'){money(d.target);need(idOK(d.accountId),'Akun tabungan wajib dipilih.');}
  if(kind==='bill'){money(d.amount);need(Number.isInteger(d.day)&&d.day>=1&&d.day<=31,'Tanggal jatuh tempo 1–31.');need(idOK(d.categoryId),'Kategori tagihan wajib dipilih.');}
  if(kind==='budget'){money(d.amount);need(idOK(d.categoryId)&&/^\d{4}-(0[1-9]|1[0-2])$/.test(d.month),'Anggaran harus memiliki kategori dan bulan.');}
 }
 return d;
}
function key(kind,id){return kind+':'+id;}
function list(entities,kind){return Object.values(entities).filter(e=>e.kind===kind&&!e.deleted).map(e=>e.data);}
function overlay(base,queue){const out=JSON.parse(JSON.stringify(base));for(const o of queue)out[key(o.kind,o.id)]={kind:o.kind,id:o.id,rev:(out[key(o.kind,o.id)]||{}).rev||0,deleted:o.deleted,data:o.data};return out;}
function relations(kind,d,entities){
 const get=(k,id)=>{const e=entities[key(k,id)];need(e&&!e.deleted,'Ditemukan referensi data yang tidak tersedia: '+k);return e.data;};
 if(kind==='tx'){
  const a=get('account',d.accountId);need(d.tanggal>=a.startDate,'Transaksi mendahului tanggal saldo awal akun.');
  if(['masuk','keluar'].includes(d.jenis)){need(get('category',d.categoryId).type===d.jenis,'Jenis kategori tidak sesuai.');}
  else {const b=get('account',d.toAccountId);need(d.tanggal>=b.startDate,'Transaksi mendahului tanggal saldo awal akun tujuan.');}
  if(d.goalId&&['setor','tarik'].includes(d.jenis)){const g=get('goal',d.goalId);need((d.jenis==='setor'?d.toAccountId:d.accountId)===g.accountId,'Akun tujuan tabungan tidak sesuai.');}
  if(d.billId)need(get('bill',d.billId).categoryId===d.categoryId,'Kategori tagihan tidak sesuai.');
 }
 if(kind==='goal')get('account',d.accountId);
 if(['bill','budget'].includes(kind))need(get('category',d.categoryId).type==='keluar','Gunakan kategori pengeluaran.');
}
function balances(entities,date='9999-12-31'){
 const out={};for(const a of list(entities,'account'))out[a.id]=date>=a.startDate?a.initial:0;
 for(const t of list(entities,'tx').filter(t=>t.tanggal<=date)){
  out[t.accountId]=(out[t.accountId]||0)+(t.jenis==='masuk'?t.jumlah:-t.jumlah);
  if(!['masuk','keluar'].includes(t.jenis))out[t.toAccountId]=(out[t.toAccountId]||0)+t.jumlah;
 }return out;
}
function saved(entities,id){return list(entities,'tx').filter(t=>t.goalId===id).reduce((n,t)=>n+(t.jenis==='setor'?t.jumlah:t.jenis==='tarik'?-t.jumlah:0),0);}
function billPaid(entities,id,period){return list(entities,'tx').filter(t=>t.jenis==='keluar'&&t.billId===id&&t.billPeriod===period).reduce((n,t)=>n+t.jumlah,0);}
function flow(txs){return {masuk:txs.filter(t=>t.jenis==='masuk').reduce((a,t)=>a+t.jumlah,0),keluar:txs.filter(t=>t.jenis==='keluar').reduce((a,t)=>a+t.jumlah,0)};}
const api={kinds,idOK,dateOK,need,money,validate,key,list,overlay,relations,balances,saved,billPaid,flow};
if(typeof module!=='undefined')module.exports=api;root.KK=api;
})(typeof globalThis!=='undefined'?globalThis:this);
