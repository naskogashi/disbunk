import { useProfilePicture } from "@/hooks/useProfilePicture";
import { useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/hooks/use-toast";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

export function PrivateAvatar({path,fallbackUrl,name,className}:{path?:string|null;fallbackUrl?:string|null;name:string;className?:string}) {
  const query=useQuery({queryKey:["signed-picture",path],enabled:!!path,staleTime:45*60*1000,refetchInterval:45*60*1000,retry:1,queryFn:async()=>{
    const result=await supabase.storage.from("pictures").createSignedUrl(path!,3600);
    if(result.error)throw result.error;return result.data.signedUrl;
  }});
  return <Avatar className={className}><AvatarImage src={path?query.data:fallbackUrl||undefined} alt={name}/><AvatarFallback>{name.split(/\s+/).slice(0,2).map(part=>part[0]).join("").toUpperCase()}</AvatarFallback></Avatar>;
}
async function preparePicture(file:File) {
  if(!["image/jpeg","image/png","image/webp"].includes(file.type))throw new Error("Use a JPEG, PNG, or WebP image.");
  if(file.size>5*1024*1024)throw new Error("The picture must be 5 MB or smaller.");
  const bitmap=await createImageBitmap(file);
  try {
    if(bitmap.width*bitmap.height>25_000_000)throw new Error("Use an image smaller than 25 megapixels.");
    const canvas=document.createElement("canvas");canvas.width=512;canvas.height=512;
    const context=canvas.getContext("2d");if(!context)throw new Error("Image processing is unavailable.");
    const side=Math.min(bitmap.width,bitmap.height);
    context.drawImage(bitmap,(bitmap.width-side)/2,(bitmap.height-side)/2,side,side,0,0,512,512);
    const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(value=>value?resolve(value):reject(new Error("Unable to prepare the picture.")),"image/webp",0.9));
    return new File([blob],"picture.webp",{type:blob.type});
  } finally{bitmap.close();}
}
export function PictureEditor({kind,entityId,path,fallbackUrl,name,onChanged}:{kind:"user"|"team";entityId:string;path?:string|null;fallbackUrl?:string|null;name:string;onChanged:(path:string|null)=>void}) {
  const {t}=useTranslation();const {toast}=useToast();const cache=useQueryClient();const input=useRef<HTMLInputElement>(null);const [busy,setBusy]=useState(false);
  const savePath=async(next:string|null)=>{
    const result=kind==="user"?await supabase.from("profiles").update({avatar_path:next}).eq("user_id",entityId).select("id").single():await supabase.rpc("set_team_picture",{target_team_id:entityId,picture_path:next});
    if(result.error)throw result.error;
    onChanged(next);cache.invalidateQueries({queryKey:["profile-picture",entityId]});
  };
  const upload=async(file:File)=>{
    setBusy(true);let uploaded:string|undefined;
    try {
      const prepared=await preparePicture(file);
      const next=`${kind==="user"?"users":"teams"}/${entityId}/${crypto.randomUUID()}.webp`;
      const result=await supabase.storage.from("pictures").upload(next,prepared,{contentType:prepared.type,cacheControl:"3600"});if(result.error)throw result.error;uploaded=next;
      await savePath(next);uploaded=undefined;
      if(path)await supabase.storage.from("pictures").remove([path]);
      toast({title:t("accountTools.pictureSaved")});
    }catch(error){if(uploaded)await supabase.storage.from("pictures").remove([uploaded]);toast({title:t("admin.error"),description:error instanceof Error?error.message:typeof error==="object"&&error&&"message" in error?String(error.message):String(error),variant:"destructive"});}
    finally{setBusy(false);if(input.current)input.current.value="";}
  };
  return <div className="space-y-3"><div className="flex flex-wrap items-center gap-4"><PrivateAvatar path={path} fallbackUrl={fallbackUrl} name={name} className="h-20 w-20 text-2xl"/><div className="flex flex-wrap gap-2"><input ref={input} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" aria-label={t("accountTools.changePicture")} disabled={busy} onChange={event=>{const file=event.target.files?.[0];if(file)void upload(file);}}/><Button type="button" size="sm" variant="outline" disabled={busy} onClick={()=>input.current?.click()}>{busy?t("common.loading"):t("accountTools.changePicture")}</Button>{path&&<Button type="button" size="sm" variant="ghost" disabled={busy} onClick={async()=>{setBusy(true);try{await savePath(null);await supabase.storage.from("pictures").remove([path]);toast({title:t("accountTools.pictureSaved")});}catch(error){toast({title:t("admin.error"),description:error instanceof Error?error.message:String(error),variant:"destructive"});}finally{setBusy(false);}}}>{t("accountTools.removePicture")}</Button>}</div></div><p className="text-xs text-muted-foreground">{t("accountTools.pictureNote")}</p></div>;
}
export function ProfilePictureEditor({userId,name}:{userId:string;name:string}) {
  const query=useProfilePicture(userId);
  const {t}=useTranslation();
  if(query.error)return <p role="alert" className="text-sm text-destructive">{t("accountTools.pictureLoadFailed")}</p>;
  if(query.isPending)return <p role="status">{t("common.loading")}</p>;
  return <PictureEditor kind="user" entityId={userId} path={query.data?.avatar_path} fallbackUrl={query.data?.avatar_url} name={name} onChanged={()=>query.refetch()}/>;
}
