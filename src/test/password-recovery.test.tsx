import {render,screen,waitFor,fireEvent,cleanup} from "@testing-library/react";
import {MemoryRouter} from "react-router-dom";
import {afterEach,beforeEach,expect,it,vi} from "vitest";
const mocks=vi.hoisted(()=>({verify:vi.fn(),update:vi.fn(),signOut:vi.fn(),toast:vi.fn()}));
vi.mock("@/lib/supabase",()=>({supabase:{auth:{verifyOtp:mocks.verify,updateUser:mocks.update,signOut:mocks.signOut}}}));
vi.mock("@/components/PublicHeader",()=>({PublicHeader:()=>null}));
vi.mock("@/components/ProjectFooter",()=>({ProjectFooter:()=>null}));
vi.mock("@/hooks/use-toast",()=>({useToast:()=>({toast:mocks.toast})}));
vi.mock("react-i18next",()=>({useTranslation:()=>({t:(key:string)=>key})}));
import ResetPassword from "@/pages/ResetPassword";
afterEach(cleanup);beforeEach(()=>vi.clearAllMocks());
it("does not change a stored account password when a valid recovery token is missing",async()=>{
 render(<MemoryRouter initialEntries={["/reset-password"]}><ResetPassword/></MemoryRouter>);
 expect(await screen.findByRole("alert")).toHaveTextContent("accountTools.resetExpired");expect(mocks.verify).not.toHaveBeenCalled();expect(screen.queryByLabelText("accountTools.newPassword")).toBeNull();
});
it("verifies a recovery token before allowing a password update and signs out after success",async()=>{
 mocks.verify.mockResolvedValue({data:{session:{access_token:"test"},user:{email:"test@example.org"}},error:null});mocks.update.mockResolvedValue({error:null});mocks.signOut.mockResolvedValue({error:null});
 render(<MemoryRouter initialEntries={["/reset-password?token_hash=test-hash&type=recovery"]}><ResetPassword/></MemoryRouter>);
 expect(await screen.findByText("test@example.org")).toBeInTheDocument();expect(mocks.verify).toHaveBeenCalledWith({token_hash:"test-hash",type:"recovery"});
 fireEvent.change(screen.getByLabelText("accountTools.newPassword"),{target:{value:"new-test-password-123"}});fireEvent.change(screen.getByLabelText("accountTools.confirmPassword"),{target:{value:"new-test-password-123"}});
 fireEvent.click(screen.getByRole("button",{name:"accountTools.savePassword"}));await waitFor(()=>expect(mocks.update).toHaveBeenCalledWith({password:"new-test-password-123"}));await waitFor(()=>expect(mocks.signOut).toHaveBeenCalled());
 expect(await screen.findByRole("status")).toHaveTextContent("accountTools.passwordSaved");
});
