# spec-template@proxy

## about
I bet you're thinking "Okay Carter, what makes this any different than the [main branch](https://github.com/Fyko/spec-template/tree/master)?"   
Then I'd say "Well, this branch uses the new:tm: [Spectacles Rest Proxy](https://github.com/spec-tacles/proxy)."  
Then you'd say, "Okay, well, sounds cool. But what the heck does it do!?"  
Then I'd say "As the name may suggest, it proxies your requests to the Discord API. All you have to do is make RPC calls to the configured RabbitMQ group and event and the proxy will handle your requests (and ratelimits) and return the response!"  

Cool, but _how do I run it_?

## running this template
It's as simple as replacing all instances of `DISCORD_TOKEN` for the environment variables in the [`docker-compose.yml`](./docker-compose.yml) file.
Then, run `docker-compose up` and boom!