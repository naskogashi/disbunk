import { expect,it } from "vitest";
import { brandedEmail } from "../../supabase/functions/_shared/email";
it("escapes names and content and retains a readable plain-text version",()=>{
  const email=brandedEmail({title:"Your workspace is ready.",name:'<img src=x onerror=alert(1)>',message:'A <script>bad()</script> message',actionUrl:"https://disbunk.org/login",actionLabel:"Open workspace"});
  expect(email.html_body).not.toContain('<img src=x');expect(email.html_body).not.toContain('<script>');
  expect(email.html_body).toContain("&lt;script&gt;");expect(email.html_body).toContain("email-logo.png");
  expect(email.text_body).toContain("https://disbunk.org/login");
});
it("does not render a script URL as a button",()=>{
  expect(brandedEmail({title:"Test",message:"Test",actionUrl:"javascript:alert(1)"}).html_body).not.toContain("javascript:");
});
