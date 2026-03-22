<div align='center'>
    <h1>malq</h1>
    <h3>a temporary email API. no credentials!</h3>
</div>

<br>

malq is a temporary email API. it:
- is designed to be very basic
- requires no credentials to use
- pulls from 50+ temporary email providers
- has 100s of domains to pull from
- uses 1 unified API to make calls

malq has a demo setup at https://malq.villainsrule.xyz. please don't spam it too hard :>

<br><br>

## setup

1. install [bun](https://bun.sh)
2. `bun i`
3. `cp .env.example .env`
4. add a **rotating** proxy to `.env`
5. `bun .`

> [!NOTE]
> if your provider supports it, use proxies in the Americas (you can usually append `-country-us` or `-region-us`). some tempmail providers block countries such as India.

<br><br>
<h5 align='center'>made with :heart:</a></h5>