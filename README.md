<div align='center'>
    <h1>malq</h1>
    <h3>a temporary email API. no credentials!</h3>
</div>

malq is made to be a very basic API with no credentials. it pulls from TONS (42 at last update) of providers and creates a unified API to get emails from them. the goal is to be as simple as possible, and to have a very large pool of providers to pull from.

malq has a demo setup at https://malq.villainsrule.xyz. please do not spam the demo.

## setup

1. install [bun](https://bun.sh)
2. `bun i`
3. add an **AT LEAST DATACENTER** proxy to `.env` (see `.env.example` for syntax)
4. `bun .`

> [!NOTE]
> some of the services for tempmail block IPs from countries like India (due to "abuse"). try to get American proxies.