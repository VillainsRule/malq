<div align='center'>
    <h1>malq</h1>
    <h3>the simplest temporary mail API. 2000 domains, 40 providers, 2 endpoints, and 0 credentials!</h3>
</div>

<br>

malq is a temporary email API. it:
- is basic, by design
- unites over 40 temporary mail providers
- uses over 2,000 domains
- has 1 unified API with only 2 endpoints
- requires no credentials to use

malq has a demo instance at https://malq.villainsrule.xyz. the instance has additional usage restrictions powered by a PoW, which you can learn about [here](https://malq.villainsrule.xyz/demo). if you want to use malq without restrictions, you can self-host it by following the instructions below.

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

i do not remove providers. if you would like your site to be removed, add a proof of work (PoW) captcha.

<br><br>
<h5 align='center'>made with :heart:</a></h5>
