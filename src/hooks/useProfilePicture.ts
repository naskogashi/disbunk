import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

export function useProfilePicture(userId?:string) {
  return useQuery({queryKey:["profile-picture",userId],enabled:!!userId,queryFn:async()=>{
    const result=await supabase.from("profiles").select("avatar_path,avatar_url").eq("user_id",userId!).single();
    if(result.error)throw result.error;return result.data as {avatar_path:string|null;avatar_url:string|null};
  }});
}
