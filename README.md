<div align='center'>
    <h1>malq</h1>
    <h3>uniting 50+ temporary mail providers under 1 API.</h3>
</div>

<br>

malq is a temporary email API. it:
- is designed to be very basic
- pulls from 50+ temporary email providers
- supports 100s of domains 
- has 1 unified API for all providers
- requires no credentials to use

malq has a demo setup at https://malq.villainsrule.xyz. please don't spam it too hard :>

<br><br>

## setup

1. install [bun](https://bun.sh) (bun required for cloudflare WAF bypass + `proxy` opt)
2. `bun i`
3. `cp .env.example .env`
4. add a **rotating** proxy to `.env`
5. `bun .`

> [!NOTE]
> if your provider supports it, use proxies in the Americas (you can usually append `-country-us` or `-region-us`). some tempmail providers block countries such as India.

<br><br>

## takedowns

if your provider is here and you want it removed, email `legal@villainsrule.xyz` from `admin@{primary domain of provider}` with proof of ownership. i do not directly remove providers, as malq is not the only service out there that uses temp mail domains at this scale. instead, i'll help you implement a captcha (my personal recommendation is a PoW) that makes it inefficient to automate your specific site. malq does not keep providers who add captchas.

<br><br>
<h5 align='center'>made with :heart:</a></h5>
