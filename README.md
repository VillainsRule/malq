<div align='center'>
    <h1>malq</h1>
    <h3>a temporary email API. no credentials!</h3>
</div>

malq has a demo setup at https://malq.villainsrule.xyz.

malq is made to be a very basic API with no credentials.

malq relies on multiple email services, the names of which exist in the [providers/impl](./src/providers/impl/) folder.

## setup

1. install [bun](https://bun.sh)
2. `bun i`
3. add a AT LEAST datacenter proxy to `.env` (see `.env.example` for syntax)
4. `bun .`

> [!NOTE]
> some of the services for tempmail block IPs from countries like India (due to "abuse"). try to get American proxies.