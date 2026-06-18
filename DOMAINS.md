CHECKER: https://sendtestmail.com

write reference:
- getaddress; nomailfetch - cheapluxurymail.xyz
- getaddress; mailfetch - temp-mail.org
- domainlist; nomailfetch - mailmomy.com
- domainlist; mailfetch - driftz.net

to do:
- temporarymail.com [ssr]
- temp-mail.africa [ssr]
- tempmail.ninja (websocket)
- mail.theloi.io.vn (clean-ish api)
- tempmail.id.vn [custom lwUpdate + SSR]
- tempmailed.com [weird]
- nukemail.app [next parsing hell]

easy:
- tmaily.com

**ERROR CODES:**
- [C] NXDOMAIN: domain doesn't exist
- serverr: server error (5xx)
- [C] timeout: request timed out
- broken: an email on the website is broken and does not receive mail
- [C] redirect: domain redirects to another temp mail provider
- blank: has literally no content
- wrapper: the provider is just a wrapper around another temp mail provider
- forwarder: the service forwards mail to other emails
- [C] parked: domain has a parking page and spams ads
- mirror: domain is a mirror of another temp mail provider
- signup: requires signup to access
- app: a mobile app
- changed: when the thing as changed to utter slop
- IP: mail is tied to IP addresses

**CHOICE CODES:**
- bad: the provider's code is bad
- slow: the provider is slow
- gmail: offers gmails only. i know gmails are good, but these are often out of storage and/or broken
- badsel: the provider has a bad domain selection

**CAPTCHA CODES:**
- hcaptcha: hcaptcha is active
- recaptcha: recaptcha is active
- turnstile: cloudflare turnstile is active (NOT WAF)
- [C] UAM: under attack mode (cloudflare)
- [C] WAF: the security screen displays
- [C] jschallenge: cloudflare's js-based challenge
- [C] recapwaf: the recaptcha WAF is active
- POW: a proof of work captcha is active
- REPCAP: a reputation-based captcha triggers
- USECAP: a captcha triggers after a few uses

**DOMAIN TRACKER:**
Y tempmail.io.vn
Y edumailfree.com
Y email10min.com
Y emailfake.com
Y email-fake.com
Y expressinboxhub.com
Y generator.email
Y tempm.com
Y tempmail.lol
Y mail-fake.com
Y mail-temp.com
Y tinyhost.shop
Y mail.chatgpt.org.uk
Y temp-mail.org
Y tmail.thangdeptrai.net
Y moakt.com
Y rootsh.com
Y priyo.email
Y tempmailo.com
Y 10minemail.com
Y mail.paicha.cloud
Y tempmail-plus.com
Y tempmail.io.vn
Y txen.de
Y linshiyouxiang.net
Y 24.email
Y z4mails.com
Y 10-minutemail.com
Y driftz.net
Y temp-mail.fyi
Y cs.email
Y noemail.cc
Y nguyendoll.com
Y inspacebox.com
Y tempmail100.com
Y tempmailbank.com
Y altaddress.org
Y onetempmail.com
Y mailporary.com
Y m2u.io
Y temp-mail.asia
Y fmail.men
Y cheapluxurymail.xyz
Y cleantempmail.com
Y mailmomy.com
Y tempmailc.com
Y run2mail.com
Y mailtemp.tech
Y tempmailget.com
Y getnada.net
Y qaz.im
Y vip.215.im
Y tempmailmmo.com
Y emailqu.com

N 0mail.pro [NXDOMAIN]
N 1secmail.cc [serverr]
N 1sec-mail.net [parked]
N 1secmail.io [changed]
N 1timeemail.com [5 domains]
N 10minuteemails.com [1 domain]
N 10minutemail.one [2 domains]
N 10minutemail.com [REPCAP]
N 10minutesemail.net [serverr]
N 1secmail.com [serverr]
N 1secemail.com [1 domain]
N 1secmail.co [NXDOMAIN]
N 1secmail.site [NXDOMAIN]
N 1sec-mail.com [broken] (api)
N 10minutemail.net [USECAP]
N 10minuteinbox.com [changed]
N 10minutemail.now [4 domains]
N 10-minutemail.net [mirror] (?)
N 10minute-mail.org [parked]
N 10minutemail.org [USECAP]
N 24hour.email [1 domain]
N 22.do [1 domain]
N 33mail.com [signup]
N 48h.email [NXDOMAIN]
N 48hr.email [slow] (cloudflare.gay)
N 5smail.email [4 domains]
N 5minmail.com [1 domain]
N 5min.email [broken] (videosave.me)
N 6d6f.com [broken] (mbejci.com)

N anonbox.net [1 domain]
N app.temailer.com [signup]
N anonymmail.net [wrapper] (?)
N adguard.com [hcaptcha]
N addy.io [signup]
N anonymster.com [changed]
N adhoc-email.com [redirect]
N alias.email [forwarder]
N adrestymczasowy.pl [1 domain]
N autolikerlive.com [1 domain]
N another-temp-mail.com [redirect]
N awamail.com [2 domains]

N byom.de [1 domain]
N burnermailbox.com [UAM]
N burnermail.io [signup]
N bccto.me [parked]
N boun.cr [forwarder]
N barid.site [NXDOMAIN]
N besttemporaryemail.com [3 domains]
N beerhut.cc [1 domain]
N boomlify.com [turnstile]
N bloumemail.com [signup]
N boltmail.us [2 domains]
N blinkmailnow.com [2 domains]
N best-temp-mail.com [1 domain]
N burner.kiwi [3 domains]

N chat-tempmail.com [signup]
N crazymailing.com [4 domains]
N candymailbox.com [serverr]
N cybertemp.xyz [PoW]
N correotemporal.org [redirect]
N cryptogmail.com [wrapper] (mail.tm)
N cloudtempmail.com [redirect]
N clauduck.com [signup]

N dropmailer.net [3 domains]
N dispoemail.org [2 domains]
N duckmail.sbs [2 domains]
N disposablemail.com [1 domain]
N donarev419.com [signup]
N dismail.top [3 domains]
N dropalias.app [serverr]
N disposableemail.co [serverr]
N delpost.ru [1 domain]
N dispostable.com [timeout]
N dyzov.com [5 domains]
N default.tmail.thehp.in [redirect]
N dispomail.xyz [3 domains]
N dropmailx.com [1 domain]
N dustbin.one [2 domains]
N dropmail.me

N emltmp.com [serverr]
N easytrashmail.eu [serverr]
N email-temporaire.fr [5 domains]
N ese.kr [1 domain]
N eml.monster [signup]
N emailondeck.com [recaptcha]
N etempmail.com [4 domains]
N etempmail.net [1 domain]
N eztempmail.com [jschallenge] (laravel)
N e4ward.com [1 domain]
N email1.io [parked]
N emailtemp.org [1 domain]
N emailme.at [1 domain]
N extraclass.ng [serverr]
N emailgenerator.org [1 domain]
N email10min.net [1 domain]
N em.bjedu.tech [signup]
N email-once.com [turnstile]
N emailgenerator.email [parked]
N expressmail.app [4 domains]
N edumail.biz [3 domains]
N emailsensei.com [1 domain]
N emailnator.com [gmail]
N eyepaste.com [1 domain]
N email-free.online [NXDOMAIN]
N emailsilo.net [serverr]
N emailtick.com [gmail]

N fake.legal [4 domains]
N fakemail.net [1 domain]
N fakermail.com [broken] (realquickemail.com)
N fmail.sbs [parked]
N fumail.co [recaptcha]
N fakemailgenerator.com [IP]
N freecustom.email [1 domain]
N fakeemail.net [4 domains]
N faxmail.co [timeout]
N fex.plus [recaptcha]
N free-temp-mail.eu.org [3 domains]

N gmailcity.com [changed]
N guerrillamail.com [branded domains]
N getnada.cc [mirror] (getnada.net)
N gpa.lu [serverr]
N ghostmail.one [app]
N grouplist.io [signup]
N getemails.uk [mirror] (mailtemp.uk)
N gettempmail.com [UAM]
N gecicimail.com.tr [1 domain]
N getimel.com [1 domain]
N gmail.pm [1 domain]
N gotempmail.me [serverr]
N getnada.com [redirect]
N goburner.com [4 domains]

N harakirimail.com [1 domain]
N haribu.net [1 domain]
N hotmail9.com [2 domains]
N helicopter-mail.com [parked]
N hunght1890.com [serverr]
N hi2.in [2 domains]

N improvmx.com [forwarder]
N inboxkitten.com [1 domain]
N inboxes.com [bad] (doesn't send full subject)
N internxt.com [wrapper] (mail.tm)
N instant-email.org [2 domains]
N incognitomail.co [turnstile]
N itselftools.com [changed]
N inboxesapp.com [1 domain]

N jonasleo.top [broken] (inrmail.info) (same temp-mailo.org)

N kingmadrid.space [NXDOMAIN]

N lroid.com [1 domain]
N linshi-email.com [1 domain]
N likemail.com [4 domains]
N luxusmail.org [redirect]
N livetempmail.com [2 domains]
N lettersboxmail.com [serverr]

N mintemail.com [1 domain]
N mails.org [hcaptcha]
N mailnesia.com [1 domain]
N minuteinbox.com [1 domain]
N muellmail.com [turnstile]
N mailsac.com [1 domain]
N mail.tm [1 domain]
N mail.gw [1 domain]
N mailscr.us [signup]
N m.kuku.lu [UAM]
N mailosaur.com [signup]
N mailtam.com [3 domains]
N mailinator.com [signup]
N minutemailbox.com [1 domain]
N mostakbile.com [1 domain]
N mailcatch.com [1 domain]
N maildax.com [1 domain]
N mailforspam.com [1 domain]
N mailfourqa.com [NXDOMAIN]
N mailgolem.com [1 domain]
N mailhole.de [1 domain]
N maillog.org [changed]
N mailper.com [1 domain]
N mailseven.io [1 domain]
N maildrop.cc [1 domain]
N mainnetmail.com [NXDOMAIN]
N mail-temp.site [NXDOMAIN]
N mailmask.cc [parked]
N mohmalmail.com [3 domains]
N mailticking.com [REPCAP]
N mailgw.com [1 domain]
N mail.awsl.uk [turnstile]
N mailbox49.com [serverr]
N mailtemp.dev [serverr]
N mytemp.email [timeout]
N mail.cx [1 domain]
N minmail.app [1 domain]
N mail10p.com [1 domain]
N mail-jetable.com [NXDOMAIN]
N mohmal.cc [parked]
N mailslurp.com [signup]
N minutesmail.com [3 domains]
N mailtemporal.net [wrapper] (mail.tm)
N mailgen.biz [badsel]
N mailforspam.net [broken] (zakute.com)
N mnx-family.com [broken] (sprytny.edu.pl)
N mailyra.com [broken] (beauturn.com)
N mail1s.net [signup] (also broken -> mailkp.pro)
N mohmal.com [badsel]
N mail4qa.com [1 domain]
N mail7.io [changed]
N maildim.com [serverr]
N mytemp-mail.com [1 domain]
N mailmenot.io [1 domain]
N mailtemp.uk [slow] (aiemail.studio)
N mail.td [POW]
N mailtemp.us [slow] (nik.edu.pl)
N mailtemp.net [2 domains] [lwmessage]
N maildrop.cx [3 domains]
N mail1sec.com [serverr]
N mailwave.dev [5 domains]
N matamail.com [1 domain]
N maildropy.com [1 domain]
N mytempmail.pro [turnstile]
N mcanswerapp.my.canva.site [serverr]
N mail-vanish.com [UAM]
N mail.0du.win [1 domain]
N mailify.org [1 domain]
N mailtemps.com [1 domain]
N minutemail.io [1 domain]
N moakt.email [redirect]
N moaktmail.com [3 domains]
N momentaryemail.com [1 domain]
N mtempmail.com [2 domains]
N my-tempmail.com [1 domain]
N mytempemail.com [changed]
N mail-temporaire.fr [forwarder]
N mail1a.de [2 domains]
N mail123.fr [badsel]
N mail.drafterplus.nl [1 domain]

N notletters.com [signup]
N noopmail.org [broken] (taohucom.store)
N nospam.today [REPCAP]
N no-spammers.com [2 domains]
N nullmail.cc [1 domain]
N nullsto.edu.pl [1 domain]

N onesecmail.xyz [serverr]
N onetimeinbox.com [4 domains]
N onetime-mail.com [1 domain]
N one-off.email [parked]
N nicemail.cc [redirect]

N premiumisme.info [2 domains]
N proxiedmail.com [forwarder]
N plingest.com [changed]
N pinmx.net [2 domains]
N purplemail.neweymail.com [REPCAP] (lwMessage)
N postinbox.org [UAM] (lwMessage, temp-mailo.org)
N postbox.cfd [serverr]
N premiumindigital.site [changed]

N quickemail.xyz [2 domains]
N quickmails.eu [serverr]

N rainmail.xyz [2 domains]
N receivemail.org [4 domains]
N reusable.email [badsel]

N segamail.com [1 domain]
N spamok.com [1 domain]
N surfshark.com [signup]
N sharklasers.com [mirror] (guerrillamail.com)
N spam4.me [mirror] (guerrillamail.com)
N spamgourmet.com [signup]
N schutz-mail.de [serverr]
N snapchat.email [4 domains]
N spoofmail.de [slow] (funnymail.de)
N sqrx.com [changed]
N spoofer.me [broken] (kingmail.store)
N smailpro.com [gmail]
N smtp.dev [signup]
N shadowmailbox.com [mirror] (boomlify.com)
N spammail.org [serverr]
N smstome.com [4 domains]
N spambox.xyz [4 domains]
N sandvpn.com [signup]
N shitmail.org [2 domains]
N smvmail.com [1 domain]
N spamdecoy.net [5 domains]
N sendbun.com [signup]

N temp2mail.top [parked]
N tmail.delivery [signup]
N tempmail.com.tr [5 domains]
N tempmail.so [4 domains]
N trashmail.com [3 domains]
N temporary-mail.net [IP]
N tempmail.cn [1 domain]
N tmailweb.com [serverr]
N tempmail.tel [serverr]
N temporarily.de [signup]
N tmail.mekongmmo.com [serverr]
N temils.com [NXDOMAIN]
N tempail.com [1 domain]
N temp-email.info [1 domain]
N temp-inbox.com [parked]
N temp-inbox.me [3 domains]
N temp-mail.gg [5 domains]
N temp-mail.id [REPCAP]
N temp-mailbox.net [serverr]
N tempemail.co [2 domains]
N tempemailfree.com [3 domains]
N tempemailgen.com [1 domain]
N tempinbox.xyz [4 domains]
N tempmail.cc [1 domain]
N tempmail.email [uses mail.tm]
N tempmail.gg [5 domains]
N tempmail.guru [changed]
N tempmail.net [1 domain]
N tempmail.adguard.com [hcaptcha]
N temp.cab [NXDOMAIN]
N tempmail.co [turnstile]
N tempmailbeast.com [NXDOMAIN]
N tempmailbox.net [4 domains]
N tempmailer.net [2 domains]
N tempmailers.com [NXDOMAIN]
N tempmailbox.com [parked]
N tempmails.net [parked]
N tempmailso.com [2 domains]
N tempo-mail.com [WAF]
N tempomail.top [1 domain]
N tempp-mails.com [1 domain]
N tempmailx.xyz [turnstile]
N tempmailbee.com [1 domain]
N temporary-email.org [5 domains]
N tempmailturbo.com [UAM]
N tempumail.com [hcaptcha]
N tmail.pro [signup]
N temail.pro [wrapper] (mail.tm)
N trashlify.com [1 domain]
N trashmail.de [UAM]
N trashmail.ws [hcaptcha]
N tmail.ai [parked]
N tmail.gg [timeout]
N tmail.io [3 domains]
N tm-mail.com [1 domain]
N tmpmail.co [1 domain]
N tempmail.pw [recaptcha]
N trash-mail.com [3 domains]
N trashmailr.com [4 domains]
N throwawaymail.com [NXDOMAIN]
N tempmailin.com [parked]
N tempmaili.com [1 domain]
N tempmail.la [UAM]
N temp.kopeechka.store [NXDOMAIN]
N tmail.nz [2 domains]
N tempmail.now [3 domains]
N tempimail.org [1 domain]
N tmail.link [1 domain]
N tempmailb.com [serverr]
N tempmail4u.com [3 domains]
N tempmailpro.org [1 domain]
N tempmail.im [1 domain]
N tempmail.ranzotech.com [3 domains]
N tempmail.ac.id [signup]
N tempboxmail.com [IP]
N trickadsagencyltd.com [1 domain]
N tempmail.best [turnstile]
N tmail.hp.gl [1 domain]
N tempmaillab.com [1 domain]
N tempo-mail.pro [UAM]
N tempusmail.com [3 domains]
N tempmailpro.in [1 domain]
N tempmail.world [1 domain]
N tempemails.net [1 domain]
N tempmailonline.co [mirror] (fmail.men)
N tempo-mail.xyz [parked]
N temprmail.com [serverr]
N trashmail.io.vn [signup]
N temp-emails.net [2 domains]
N tem-mail.net [WAF]
N tempmail.blog [1 domain]
N tempmailcentral.com [3 domains]
N tempmail.uno [changed]
N tempmail.dev [parked]
N tempmail.quest [turnstile]
N tempmailid.com [NXDOMAIN]
N thetemp.email [4 domains]
N tempmail.plus [wrapper] (fex.plus)
N tempmailspin.com [serverr]
N tempmail44.com [broken] (gmaiil.shop)
N temp-mail.now [1 domain]
N tempr.email [4 domains]
N temporarymail.com [bad] (needs extra req for subject im crine)
N trash-mail.de [3 domains]
N tempmailg.com [UAM] (laravel)
N tmail.dark2web.com [serverr] (lwMessage)
N tempmailfa.st [bad] (body is sometimes missing)
N tmp.al [app]
N tempmailinbox.com [serverr]
N tempmail.us.com [serverr]
N temp-mail.us [4 domains]
N tempmail.altmails.com [1 domain]
N tempmaily.com [NXDOMAIN]
N treemail.pro [turnstile]
N temporam.com [slow] (entire api)
N temp-mail.club [broken] (17.mailings.live)
N trashmailr.com [mirror] (tempr.email)
N tmail.xuanlich.com [serverr]
N tempmail.edu.kg [1 domain]
N tempora.email [2 domains]
N t4.2xinxian.top [signup]
N temp-mail-free.com [5 domains]
N tempmail200.com [serverr]
N tempmail.jamcry.app [app]
N tempmailpro.asia [app]
N tempmail.ing [4 domains]
N tempmail.ee [4 domains]
N temp-mail.lol [5 domains]
N temporarymail.info [2 domains]
N tempmail.co.uk [1 domain]
N tempmailsall.com [2 domains]
N tmailormail.com [3 domains]
N tempmailo.org [changed]
N tememail.org [UAM]
N tempmailapi.com [changed]
N tempmail.fish [3 domains]
N tempamail.com [3 domains]
N tempmail365.com [timeout]
N temp-mail-365.info [NXDOMAIN]
N trashinbox.net [4 domains]
N trashymails.com [2 domains]
N tempemailer.org [1 domain]
N tempmailfree.com [1 domain]
N tempmailbox.io [2 domains]
N tempmail.sk [NXDOMAIN]
N tempemaill.com [NXDOMAIN]
N tempumail.org [1 domain]
N tempmail.pink [1 domain]
N tempmailo.io [expired]
N temp-mail-email.org [1 domain]
N temp-mail.snaper24.com [1 domain]
N tempmaila.org [1 domain]
N temp-mail.org.in [serverr]
N tempmail.cx [1 domain]
N tempmailaddress.com [redirect]
N temp-mail-365.com [2 domains]
N tempsmail.org [3 domains]
N tempmailv5.site [broken] (mailvinhcuu.dpdns.org)
N temp-mail.io [broken] (gmeenramy.com)
N tempdukviet.click [badsel] (lwMessage)
N temp-mailo.org [broken] (nutioan.online)
N throwaway.io [broken] (pembrookgroup.net)
N tmailor.com [4 domains] (etubemail.com broken)

N unlimitmail.com [signup]
N unstablemail.com [NXDOMAIN]
N upxmail.com [changed]

N vsmailpro.com [NXDOMAIN]
N vmail.dev [turnstile]
N vortex.skyfall.dev [3 domains]
N voo-email.com [NXDOMAIN]

N wp-temp-mail.com [changed]
N wabblywabble.com [NXDOMAIN]
N wwpager.com [signup]
N wegwerfemailadresse.com [IP]
N worldtempmail.com [parked]

N xeramail.com [2 domains]

N yopmail.com [recaptcha]
N yopmail.fr [mirror] (yopmail.com)
N yours.tools [3 domains]
N youxiang.dev [2 domains]

N zemail.me [2 domains]
N zhimail.xyz [4 domains]