import {render,screen,fireEvent,waitFor,cleanup} from "@testing-library/react";
import {afterEach,beforeEach,expect,it,vi} from "vitest";
const mocks=vi.hoisted(()=>({invoke:vi.fn(),toast:vi.fn()}));
vi.mock("@/contexts/AuthContext",()=>({useAuth:()=>({user:{id:"admin"}})}));
vi.mock("@/lib/supabase",()=>({supabase:{rpc:vi.fn()}}));
vi.mock("@/lib/invoke-function",()=>({invokeFunction:mocks.invoke}));
vi.mock("@/hooks/use-toast",()=>({useToast:()=>({toast:mocks.toast})}));
vi.mock("@/components/ProfilePictures",()=>({PrivateAvatar:()=>null}));
vi.mock("react-i18next",()=>({useTranslation:()=>({t:(key:string,args?:{name?:string})=>key+(args?.name?`: ${args.name}`:"")})}));
import {AdminAccountList,type ManagedAccount} from "@/components/AdminAccountList";
const users:ManagedAccount[]=[{id:"profile-admin",user_id:"admin",full_name:"Admin",status:"approved",roles:["admin"],created_at:"2026-10-22"},{id:"p1",user_id:"one",full_name:"Person One",status:"pending_approval",roles:["analyst"],created_at:"2026-10-22"},{id:"p2",user_id:"two",full_name:"Person Two",status:"pending_approval",roles:["analyst"],created_at:"2026-10-22"}];
afterEach(cleanup);beforeEach(()=>vi.clearAllMocks());
it("selects visible accounts without selecting the admin and requires confirmation before applying an action",async()=>{
 mocks.invoke.mockResolvedValue({results:[{userId:"one",success:true},{userId:"two",success:true}],successCount:2,failedCount:0});
 render(<AdminAccountList users={users} scope="all" onChanged={()=>{}}/>);
 expect(screen.getByLabelText("accountTools.selectAccount: Admin")).toBeDisabled();fireEvent.click(screen.getByLabelText("accountTools.selectVisible"));
 fireEvent.click(screen.getByRole("button",{name:"accountTools.suspendSelected"}));expect(mocks.invoke).not.toHaveBeenCalled();
 fireEvent.click(screen.getByRole("button",{name:"accountTools.confirm"}));await waitFor(()=>expect(mocks.invoke).toHaveBeenCalledWith("account-actions",{action:"suspend",userIds:["one","two"],scope:"all"}));
});
it("retains failed pending accounts for review while reporting partial results",async()=>{
 mocks.invoke.mockResolvedValue({results:[{userId:"one",success:true},{userId:"two",success:false,error:"Account is no longer pending"}],successCount:1,failedCount:1});
 render(<AdminAccountList users={users.slice(1)} scope="pending" onChanged={()=>{}}/>);fireEvent.click(screen.getByLabelText("accountTools.selectVisible"));fireEvent.click(screen.getByRole("button",{name:"accountTools.approveSelected"}));fireEvent.click(screen.getByRole("button",{name:"accountTools.confirm"}));
 expect(await screen.findByRole("alert")).toHaveTextContent("Person Two: Account is no longer pending");expect(screen.getByLabelText("accountTools.selectAccount: Person Two")).toBeChecked();expect(screen.getByLabelText("accountTools.selectAccount: Person One")).not.toBeChecked();
});
