import type { PublicLanguage, PublicPageId } from '@/lib/public-site';
export type PublicContent = { title: string; description: string; sections: { title: string; body: string }[] };
type Copy = Record<Exclude<PublicPageId,'home'>, PublicContent>;
export const publicCopy: Record<PublicLanguage,Copy> = {
  en: {
    about: { title:'About Disbunk', description:'Disbunk brings journalists, researchers and civil society together to verify claims and respond to disinformation in the Western Balkans.', sections:[
      {title:'A workspace for evidence and collaboration',body:'Disbunk is a collaborative platform where journalists, researchers and civil society verify claims, preserve evidence and coordinate responses to disinformation. Its regional focus is Albania, Kosovo and North Macedonia, with Albanian and English interfaces.'},
      {title:'Project origins and partners',body:'Disbunk is a project of Sbunker NGO (sbunker.org). CODON is its technical partner. The project grew from a hackathon under the CIVICUS Digital Democracy Initiative, implemented by Metamorphosis Foundation in partnership with Civic Literacy Initiative. Disbunk acknowledges Sbunker and its technical cooperation with CODON, part of Progon LLC.'},
      {title:'A distinct project',body:'Disbunk is a separate project focused on the Western Balkans. It is not affiliated with Debunk.org in Lithuania. Findings in Disbunk depend on evidence and editorial review, rather than an automated label.'},
      {title:'Open development',body:'The application source is available at github.com/naskogashi/disbunk. Public pages describe the implemented workflow and distinguish working features from integrations still being prepared.'},
    ]},
    methodology: {title:'How verification works in Disbunk',description:'Follow the Disbunk verification process: record a claim, trace its sources, preserve evidence, review findings and prepare a documented response.',sections:[
      {title:'1. Record the claim and its context',body:'Record the exact statement, source link and relevant context. A reported claim is a starting point for investigation, not a conclusion about its truth.'},
      {title:'2. Trace sources and preserve evidence',body:'Find the original source, check dates and context, and collect supporting or contradicting material. Evidence files are kept with the investigation; file hashes help detect changes to a file, but do not establish that its contents are true.'},
      {title:'3. Review findings before responding',body:'Researchers document their reasoning and request editorial review. Verified means the reviewed evidence supports the claim; debunked means the evidence contradicts it; escalated means the case needs additional review or action. These workflow outcomes should be read with their sources and explanation.'},
      {title:'4. Correct the record',body:'If you identify a mistake, contact info@disbunk.org with the claim link, the disputed statement and supporting sources. The team can review the case and update its findings. This page does not promise a response deadline.'},
      {title:'What AI clustering can and cannot do',body:'Multilingual embeddings and HDBSCAN suggest similar recorded claims within each team. Researchers review suggestions before creating campaigns. Similarity does not prove coordination or falsity. Outliers are not deleted, and the worker does not automatically monitor the whole internet.'},
      {title:'Access and publication',body:'Investigation records belong to the signed-in workspace. A public explanation of a feature is not permission to access private evidence. Public fact-check result pages are not currently published automatically.'},
    ]},
    claims:{title:'Claim tracking for fact-checking teams',description:'Record suspicious statements, retain their source links and follow an investigation from submission through review in the Disbunk workspace.',sections:[
      {title:'Keep the statement and source together',body:'Start with the exact claim and a source link. Add context so another researcher can understand what was said, where it appeared and why it needs review.'},
      {title:'Follow the investigation',body:'Track status, assign tasks and connect evidence to the case. Structured response workflows help a team move from a report to documented findings.'},
      {title:'Get access',body:'Claim submission and investigation require a Disbunk account. New registrations are reviewed by an administrator; available actions depend on the approved role.'},
    ]},
    evidence:{title:'Evidence storage for documented investigations',description:'Keep source material and files connected to claims, with integrity hashes and controlled workspace access for Disbunk research teams.',sections:[
      {title:'Preserve the material behind a finding',body:'Upload supporting files and link them to an investigation. Keep source context alongside the material so reviewers can follow the reasoning.'},
      {title:'Integrity and access',body:'SHA-256 fingerprints help identify file changes. A matching fingerprint establishes file integrity, not the truth of the evidence. Workspace permissions control access to stored material.'},
      {title:'Handle sensitive material carefully',body:'Review personal information and source risks before uploading. Do not assume that every file is suitable for public sharing. DocumentCloud integration is planned; it does not currently publish evidence from Disbunk.'},
    ]},
    campaigns:{title:'Connect related claims into researched campaigns',description:'Use reviewed semantic suggestions to connect related claims and document recurring narratives without treating similarity as proof of coordination.',sections:[
      {title:'From individual claims to a wider pattern',body:'Campaigns connect claims that a team decides belong together. Their evidence and context remain available for review.'},
      {title:'Suggestions with human review',body:'A bounded, periodic worker uses multilingual embeddings and HDBSCAN to suggest groups of recent recorded claims within each team. Approved administrators review the suggestions before turning them into campaigns.'},
      {title:'Limits of the analysis',body:'Small datasets may produce no groups. Similar wording does not prove an organized campaign, and ungrouped claims remain available. Researchers must establish the relationship using sources and evidence.'},
    ]},
    teams:{title:'Team coordination for disinformation investigations',description:'Organize researchers, assign responsibilities and review work with role-based access inside the Disbunk investigation workspace.',sections:[
      {title:'A shared place for the next step',body:'Teams organize members and investigations. Assign responsibilities and keep the claim, evidence and response workflow connected.'},
      {title:'Access follows responsibility',body:'Administrators manage accounts and team settings. Team leads manage their teams; analysts and viewers have access appropriate to their roles. New accounts require approval.'},
      {title:'Notifications',body:'In-app notifications support collaboration today. Slack, Discord and Telegram delivery is planned and is not connected yet. External channel delivery will require a configured destination and controlled sharing.'},
    ]},
    faq:{title:'Frequently asked questions about Disbunk',description:'Who can use Disbunk, how accounts are approved, how claims are reviewed and how the Western Balkans project differs from Debunk.org.',sections:[
      {title:'Who can submit a claim?',body:'People with an approved Disbunk account can submit claims according to their assigned role. Registration is available through the sign-in page and is reviewed by an administrator.'},
      {title:'Does Disbunk automatically decide what is true?',body:'No. Researchers assess sources and evidence. HDBSCAN suggests similar claims for review; it does not issue a truth verdict or prove coordination.'},
      {title:'Is evidence public?',body:'Evidence is held in the signed-in workspace with access controls. It is not automatically published on the public website.'},
      {title:'Is Disbunk the same as Debunk.org?',body:'No. Disbunk is a separate Western Balkans project and is not affiliated with Debunk.org in Lithuania.'},
      {title:'Does it cost anything?',body:'No public pricing or subscription plan is currently published. Contact the team about access and any applicable conditions; this page does not promise a permanent free service.'},
      {title:'Which external tools are connected?',body:'Supabase supports accounts, data and storage, and SMTP2GO supports email delivery. Google Cloud Translation activation is being configured. DocumentCloud and Slack, Discord or Telegram integrations are planned.'},
    ]},
    contact:{title:'Contact the Disbunk team',description:'Contact Disbunk about account access, corrections and collaboration on fact-checking and disinformation response in the Western Balkans.',sections:[
      {title:'Access, corrections and collaboration',body:'Email info@disbunk.org. For a correction, include the relevant claim link, explain the issue and provide sources. Never send a password, API key or sensitive evidence in an initial support email.'},
      {title:'Project information',body:'Disbunk is a project of Sbunker NGO (sbunker.org), with CODON as technical partner. It focuses on collaboration among journalists, researchers and civil society in the Western Balkans. Project partners and technical cooperation are described on the About page.'},
    ]},
    privacy:{title:'Privacy information',description:'An overview of account data, investigation material and browser preferences used by Disbunk. The complete privacy notice is under review.',sections:[
      {title:'Notice under review',body:'This overview is not a complete privacy policy. Disbunk is a project of Sbunker NGO. The project team still needs to confirm formal legal contact details, retention periods and the process for exercising data rights.'},
      {title:'Data used by the application',body:'The workspace uses account and profile information, team membership, claims, uploaded evidence and activity records. Supabase provides authentication, database and storage services; SMTP2GO handles configured email delivery.'},
      {title:'Browser preferences and questions',body:'The browser remembers language and appearance preferences, and authentication uses browser storage. Contact info@disbunk.org for privacy questions. Do not upload sensitive material until your team has assessed the purpose and access requirements.'},
    ]},
    terms:{title:'Service information and terms',description:'Current access and use information for Disbunk. Formal service terms await confirmation by the project team.',sections:[
      {title:'Formal terms are being prepared',body:'This page describes current application behavior and is not a finalized legal agreement. Disbunk is a project of Sbunker NGO, with CODON as technical partner. Formal service terms still need confirmation by the project team.'},
      {title:'Accounts and responsible use',body:'Workspace access requires an account and administrator approval. Permissions depend on the assigned role. Submit source context and evidence responsibly, and do not use the service to expose private information or distribute unsupported accusations.'},
      {title:'Research requires judgment',body:'Automated suggestions assist research. They do not replace editorial verification, establish legal responsibility or guarantee that a claim is true or false. Contact info@disbunk.org with questions about access.'},
    ]},
  },
  sq: {
    about:{title:'Rreth Disbunk',description:'Disbunk bashkon gazetarë, hulumtues dhe shoqërinë civile për verifikimin e pretendimeve dhe reagimin ndaj dezinformimit në Ballkanin Perëndimor.',sections:[
      {title:'Një hapësirë për prova dhe bashkëpunim',body:'Disbunk është platformë bashkëpunimi ku gazetarët, hulumtuesit dhe shoqëria civile verifikojnë pretendime, ruajnë prova dhe koordinojnë reagimin ndaj dezinformimit. Fokusi rajonal është Shqipëria, Kosova dhe Maqedonia e Veriut, me ndërfaqe në shqip dhe anglisht.'},
      {title:'Origjina dhe partnerët e projektit',body:'Disbunk është projekt i OJQ-së Sbunker (sbunker.org). CODON është partneri teknik. Projekti lindi nga një hakaton në kuadër të CIVICUS Digital Democracy Initiative, zbatuar nga Metamorphosis Foundation në partneritet me Civic Literacy Initiative. Disbunk njeh kontributin e Sbunker dhe bashkëpunimin teknik me CODON, pjesë e Progon LLC.'},
      {title:'Një projekt më vete',body:'Disbunk është projekt më vete me fokus në Ballkanin Perëndimor. Nuk është i lidhur me Debunk.org në Lituani. Përfundimet në Disbunk mbështeten në prova dhe shqyrtim redaktorial, jo në një etiketë automatike.'},
      {title:'Zhvillim i hapur',body:'Kodi i aplikacionit gjendet në github.com/naskogashi/disbunk. Faqet publike shpjegojnë procesin e zbatuar dhe dallojnë veçoritë funksionale nga integrimet që po përgatiten.'},
    ]},
    methodology:{title:'Si funksionon verifikimi në Disbunk',description:'Ndiqni procesin e verifikimit në Disbunk: regjistrimi i pretendimit, kontrolli i burimeve, ruajtja e provave dhe shqyrtimi para përgjigjes.',sections:[
      {title:'1. Regjistroni pretendimin dhe kontekstin',body:'Shënoni deklaratën e saktë, lidhjen e burimit dhe kontekstin përkatës. Raportimi i një pretendimi është pikënisje për hulumtim, jo përfundim për vërtetësinë e tij.'},
      {title:'2. Ndiqni burimet dhe ruani provat',body:'Gjeni burimin fillestar, kontrolloni datat e kontekstin dhe mblidhni materiale që e mbështesin ose e kundërshtojnë pretendimin. Gjurmët digjitale të skedarëve ndihmojnë të zbulohen ndryshimet, por nuk provojnë vërtetësinë e përmbajtjes.'},
      {title:'3. Shqyrtoni gjetjet para përgjigjes',body:'Hulumtuesit dokumentojnë arsyetimin dhe kërkojnë shqyrtim redaktorial. I verifikuar do të thotë se provat e shqyrtuara e mbështesin pretendimin; i përgënjeshtruar se provat e kundërshtojnë; i përshkallëzuar se rasti kërkon shqyrtim ose veprim shtesë. Këto rezultate duhen lexuar bashkë me burimet dhe shpjegimin.'},
      {title:'4. Korrigjoni gabimet',body:'Nëse gjeni një gabim, shkruani në info@disbunk.org me lidhjen e pretendimit, deklaratën që kundërshtoni dhe burimet mbështetëse. Ekipi mund ta rishqyrtojë rastin dhe t’i përditësojë gjetjet. Kjo faqe nuk premton afat përgjigjeje.'},
      {title:'Çfarë mund dhe nuk mund të bëjë grupimi me IA',body:'Përfaqësimet semantike shumëgjuhëshe dhe HDBSCAN sugjerojnë pretendime të ngjashme brenda secilit ekip. Hulumtuesit i shqyrtojnë sugjerimet para krijimit të fushatave. Ngjashmëria nuk provon koordinim ose pavërtetësi. Rastet jashtë grupeve nuk fshihen dhe sistemi nuk monitoron automatikisht tërë internetin.'},
      {title:'Qasja dhe publikimi',body:'Të dhënat e hulumtimeve gjenden në hapësirën që kërkon hyrje. Shpjegimi publik i një veçorie nuk jep qasje në prova private. Aktualisht, rezultatet e verifikimeve nuk publikohen automatikisht si faqe publike.'},
    ]},
    claims:{title:'Ndjekja e pretendimeve për ekipet e verifikimit',description:'Regjistroni deklarata të dyshimta, ruani lidhjet e burimeve dhe ndiqni hulumtimin nga paraqitja deri te shqyrtimi në hapësirën Disbunk.',sections:[
      {title:'Mbani bashkë deklaratën dhe burimin',body:'Filloni me pretendimin e saktë dhe lidhjen e burimit. Shtoni kontekst që hulumtuesit e tjerë ta kuptojnë çfarë është thënë, ku është publikuar dhe pse kërkon shqyrtim.'},
      {title:'Ndiqni ecurinë e hulumtimit',body:'Ndiqni statusin, caktoni detyra dhe lidhni provat me rastin. Proceset e strukturuara të përgjigjes e ndihmojnë ekipin të kalojë nga raportimi te gjetjet e dokumentuara.'},
      {title:'Merrni qasje',body:'Paraqitja dhe hulumtimi i pretendimeve kërkojnë llogari në Disbunk. Regjistrimet e reja shqyrtohen nga administratori; veprimet e lejuara varen nga roli i miratuar.'},
    ]},
    evidence:{title:'Ruajtja e provave për hulumtime të dokumentuara',description:'Mbani materialet burimore dhe skedarët të lidhur me pretendimet, me gjurmë integriteti dhe qasje të kontrolluar për ekipet hulumtuese të Disbunk.',sections:[
      {title:'Ruani materialin pas një përfundimi',body:'Ngarkoni skedarë mbështetës dhe lidhini me hulumtimin. Mbani kontekstin e burimit pranë materialit, që shqyrtuesit ta ndjekin arsyetimin.'},
      {title:'Integriteti dhe qasja',body:'Gjurmët SHA-256 ndihmojnë të identifikohen ndryshimet në skedar. Përputhja e gjurmës tregon integritetin e skedarit, jo vërtetësinë e provës. Lejet e hapësirës së punës kontrollojnë qasjen në material.'},
      {title:'Trajtoni me kujdes materialet e ndjeshme',body:'Shqyrtoni të dhënat personale dhe rreziqet për burimet para ngarkimit. Jo çdo skedar është i përshtatshëm për publikim. Integrimi me DocumentCloud është i planifikuar dhe aktualisht nuk publikon prova nga Disbunk.'},
    ]},
    campaigns:{title:'Lidhni pretendimet në fushata të hulumtuara',description:'Përdorni sugjerime semantike të shqyrtuara për të lidhur pretendime dhe dokumentuar narrativa të përsëritura, pa e trajtuar ngjashmërinë si provë koordinimi.',sections:[
      {title:'Nga pretendimi te modeli më i gjerë',body:'Fushatat lidhin pretendime që ekipi vendos se duhen trajtuar së bashku. Provat dhe konteksti i tyre mbeten të disponueshme për shqyrtim.'},
      {title:'Sugjerime me shqyrtim njerëzor',body:'Një proces periodik me kufij të caktuar përdor përfaqësime semantike shumëgjuhëshe dhe HDBSCAN për të sugjeruar grupe pretendimesh të fundit brenda ekipit. Administratorët e miratuar i shqyrtojnë sugjerimet para krijimit të fushatave.'},
      {title:'Kufijtë e analizës',body:'Një numër i vogël pretendimesh mund të mos krijojë asnjë grup. Formulimi i ngjashëm nuk provon një fushatë të organizuar dhe pretendimet jashtë grupeve mbeten të disponueshme. Lidhja vërtetohet me burime dhe prova.'},
    ]},
    teams:{title:'Bashkëpunimi i ekipeve në hulumtimin e dezinformimit',description:'Organizoni hulumtuesit, caktoni përgjegjësi dhe shqyrtoni punën me qasje sipas rolit në hapësirën e hulumtimit Disbunk.',sections:[
      {title:'Një hapësirë e përbashkët për hapin e radhës',body:'Ekipet organizojnë anëtarët dhe hulumtimet. Caktoni përgjegjësi dhe mbani të lidhura pretendimin, provat dhe procesin e përgjigjes.'},
      {title:'Qasja ndjek përgjegjësinë',body:'Administratorët menaxhojnë llogaritë dhe cilësimet e ekipeve. Udhëheqësit menaxhojnë ekipet e tyre; analistët dhe vëzhguesit kanë qasje sipas roleve. Llogaritë e reja kërkojnë miratim.'},
      {title:'Njoftimet',body:'Njoftimet brenda aplikacionit e mbështesin bashkëpunimin sot. Dërgimi përmes Slack, Discord dhe Telegram është i planifikuar dhe ende nuk është lidhur. Dërgimi në kanale të jashtme kërkon destinacion të konfiguruar dhe ndarje të kontrolluar.'},
    ]},
    faq:{title:'Pyetje të shpeshta për Disbunk',description:'Kush mund ta përdorë Disbunk, si miratohen llogaritë, si shqyrtohen pretendimet dhe si ndryshon projekti nga Debunk.org.',sections:[
      {title:'Kush mund të paraqesë një pretendim?',body:'Personat me llogari të miratuar në Disbunk mund të paraqesin pretendime sipas rolit të tyre. Regjistrimi bëhet nga faqja e hyrjes dhe shqyrtohet nga administratori.'},
      {title:'A vendos Disbunk automatikisht çfarë është e vërtetë?',body:'Jo. Hulumtuesit vlerësojnë burimet dhe provat. HDBSCAN sugjeron pretendime të ngjashme për shqyrtim; nuk jep verdikt për vërtetësinë dhe nuk provon koordinim.'},
      {title:'A janë provat publike?',body:'Provat ruhen në hapësirën që kërkon hyrje, me kontroll të qasjes. Nuk publikohen automatikisht në faqen publike.'},
      {title:'A është Disbunk i njëjti projekt me Debunk.org?',body:'Jo. Disbunk është projekt më vete i Ballkanit Perëndimor dhe nuk është i lidhur me Debunk.org në Lituani.'},
      {title:'A ka pagesë për përdorimin?',body:'Aktualisht nuk është publikuar plan çmimesh ose abonimi. Kontaktoni ekipin për qasjen dhe kushtet përkatëse; kjo faqe nuk premton shërbim falas përgjithmonë.'},
      {title:'Cilat mjete të jashtme janë lidhur?',body:'Supabase mbështet llogaritë, të dhënat dhe ruajtjen, ndërsa SMTP2GO dërgimin e email-eve. Aktivizimi i Google Cloud Translation po konfigurohet. DocumentCloud dhe Slack, Discord ose Telegram janë integrime të planifikuara.'},
    ]},
    contact:{title:'Kontaktoni ekipin Disbunk',description:'Kontaktoni Disbunk për qasje në llogari, korrigjime dhe bashkëpunim në verifikimin e fakteve e reagimin ndaj dezinformimit në Ballkanin Perëndimor.',sections:[
      {title:'Qasje, korrigjime dhe bashkëpunim',body:'Shkruani në info@disbunk.org. Për korrigjime, përfshini lidhjen e pretendimit, shpjegimin e çështjes dhe burimet. Mos dërgoni fjalëkalime, çelësa API ose prova të ndjeshme në email-in fillestar të mbështetjes.'},
      {title:'Informacion për projektin',body:'Disbunk është projekt i OJQ-së Sbunker (sbunker.org), me CODON si partner teknik. Përqendrohet në bashkëpunimin e gazetarëve, hulumtuesve dhe shoqërisë civile në Ballkanin Perëndimor. Partnerët dhe bashkëpunimi teknik përshkruhen në faqen Rreth nesh.'},
    ]},
    privacy:{title:'Informacion për privatësinë',description:'Përmbledhje e të dhënave të llogarisë, materialeve të hulumtimit dhe preferencave të shfletuesit në Disbunk. Njoftimi i plotë po shqyrtohet.',sections:[
      {title:'Njoftimi është në shqyrtim',body:'Kjo përmbledhje nuk është politikë e plotë privatësie. Disbunk është projekt i OJQ-së Sbunker. Ekipi duhet ende të konfirmojë të dhënat formale juridike të kontaktit, afatet e ruajtjes dhe procesin për ushtrimin e të drejtave mbi të dhënat.'},
      {title:'Të dhënat që përdor aplikacioni',body:'Hapësira e punës përdor të dhëna të llogarisë e profilit, anëtarësinë në ekip, pretendimet, provat e ngarkuara dhe regjistrat e veprimtarisë. Supabase ofron shërbimet e autentikimit, bazës së të dhënave dhe ruajtjes; SMTP2GO dërgon email-et e konfiguruara.'},
      {title:'Preferencat e shfletuesit dhe pyetjet',body:'Shfletuesi ruan preferencat e gjuhës dhe pamjes; autentikimi përdor ruajtjen në shfletues. Për pyetje mbi privatësinë, shkruani në info@disbunk.org. Mos ngarkoni material të ndjeshëm pa vlerësuar qëllimin dhe kërkesat e qasjes.'},
    ]},
    terms:{title:'Informacion për shërbimin dhe kushtet',description:'Informacion për qasjen dhe përdorimin aktual të Disbunk. Kushtet formale të shërbimit presin konfirmimin e ekipit të projektit.',sections:[
      {title:'Kushtet formale po përgatiten',body:'Kjo faqe përshkruan sjelljen aktuale të aplikacionit dhe nuk është marrëveshje juridike përfundimtare. Disbunk është projekt i OJQ-së Sbunker, me CODON si partner teknik. Kushtet formale të shërbimit duhet ende të konfirmohen nga ekipi.'},
      {title:'Llogaritë dhe përdorimi i përgjegjshëm',body:'Qasja në hapësirën e punës kërkon llogari dhe miratim nga administratori. Lejet varen nga roli. Paraqitni me përgjegjësi kontekstin dhe provat; mos e përdorni shërbimin për ekspozimin e të dhënave private ose shpërndarjen e akuzave pa mbështetje.'},
      {title:'Hulumtimi kërkon gjykim njerëzor',body:'Sugjerimet automatike ndihmojnë hulumtimin. Nuk zëvendësojnë verifikimin redaktorial, nuk përcaktojnë përgjegjësi juridike dhe nuk garantojnë vërtetësinë ose pavërtetësinë e një pretendimi. Për qasjen, shkruani në info@disbunk.org.'},
    ]},
  },
};
