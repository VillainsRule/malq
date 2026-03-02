<div align='center'>
    <h1>malq</h1>
    <h3>a temporary email API. no credentials!</h3>
</div>

malq is a temporary email API. it:
- is designed to be very basic
- requires no credentials to use
- pulls from 50+ temporary email providers
- has 100s of domains to pull from
- uses 1 unified API to make calls

malq has a demo setup at https://malq.villainsrule.xyz. please do not spam it.

## setup

1. install [bun](https://bun.sh)
2. `bun i`
3. add an **AT LEAST DATACENTER** proxy to `.env` (see `.env.example` for syntax)
4. `bun .`

> [!NOTE]
> some of the services for tempmail block IPs from countries like India (due to "abuse"). try to get American proxies.