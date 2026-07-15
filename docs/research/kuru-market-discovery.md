# Kuru market discovery

调查日期：2026-07-15。源码结论固定到 Kuru SDK commit [`636509c`](https://github.com/Kuru-Labs/kuru-sdk/tree/636509c2eafd63479d3f399703354e0d09f51e18) 和公开合约 commit [`2060bb2`](https://github.com/Kuru-Labs/Kuru-contracts-dex-public/tree/2060bb2736080c175d80d568bfdb6226bb5abd04)。

## 结论

- Kuru 官方把 `Router` 称为 **market factory**，但它不是按 token pair 查询地址的 Uniswap 式 Factory。公开 Router 没有 `getPool(tokenA, tokenB)`、`getMarket(...)` 或 market 枚举函数。[官方地址表](https://docs.kuru.io/contracts/Contract-addresses)、[Router.sol](https://github.com/Kuru-Labs/Kuru-contracts-dex-public/blob/2060bb2736080c175d80d568bfdb6226bb5abd04/contracts/Router.sol)、[IRouter.sol](https://github.com/Kuru-Labs/Kuru-contracts-dex-public/blob/2060bb2736080c175d80d568bfdb6226bb5abd04/contracts/interfaces/IRouter.sol)
- Router 只有按 **market address** 索引的 `verifiedMarket` mapping。`computeAddress` 也不能只凭 token pair 使用，因为地址 salt 还包含 precision、tick、size、fees 和 spread 等完整部署参数。[Router.sol#L39](https://github.com/Kuru-Labs/Kuru-contracts-dex-public/blob/2060bb2736080c175d80d568bfdb6226bb5abd04/contracts/Router.sol#L39)、[Router.sol#L124-L162](https://github.com/Kuru-Labs/Kuru-contracts-dex-public/blob/2060bb2736080c175d80d568bfdb6226bb5abd04/contracts/Router.sol#L124-L162)、[Router.sol#L210-L245](https://github.com/Kuru-Labs/Kuru-contracts-dex-public/blob/2060bb2736080c175d80d568bfdb6226bb5abd04/contracts/Router.sol#L210-L245)
- 纯链上发现的官方方法是索引 Router 的 `MarketRegistered` 事件；Kuru 的集成文档明确要求先用这个事件发现所有 market，再监听各 market 的 `Trade`。[官方集成文档](https://docs.kuru.io/contracts/Integration)、[MarketRegistered 定义](https://github.com/Kuru-Labs/Kuru-contracts-dex-public/blob/2060bb2736080c175d80d568bfdb6226bb5abd04/contracts/interfaces/IRouter.sol#L22-L36)
- 官方 TypeScript SDK 当前没有通过 Factory getter 找池。`PoolFetcher.getAllPools()` 生成 direct pair、输入/输出 token 与 base tokens 的 pair，以及 base-token 组合，然后向 `${baseUrl}/api/v1/markets/filtered` 发 POST 请求；响应中的 `baseasset`、`quoteasset`、`market` 被映射成 pool。[PoolFetcher 源码](https://github.com/Kuru-Labs/kuru-sdk/blob/636509c2eafd63479d3f399703354e0d09f51e18/src/pools/fetcher.ts#L25-L97)
- `PathFinder.findBestPath()` 接收调用方直接提供的 pools，或者调用上述 `PoolFetcher`；随后在 pool 图中枚举最多两跳的 route，逐条从链上读取 market 参数并报价，最后选择 route。[PathFinder 源码](https://github.com/Kuru-Labs/kuru-sdk/blob/636509c2eafd63479d3f399703354e0d09f51e18/src/router/path.ts#L12-L80)、[两跳搜索](https://github.com/Kuru-Labs/kuru-sdk/blob/636509c2eafd63479d3f399703354e0d09f51e18/src/router/path.ts#L98-L123)

## 对 Moss 的含义

不存在“一次链上 `getPool(tokenA, tokenB)`”这条路径。最小可行选择只有两个：

1. 接受 Kuru 一方服务依赖：像官方 SDK 一样调用 filtered-markets API，只查询 direct 与 via-MON 所需 pairs。
2. 坚持纯 RPC：索引 `MarketRegistered`，再用 `verifiedMarket(marketAddress)` 校验候选 market。

如果接受由 Kuru 直接完成路由与交易构造，还可以调用官方 Kuru Flow `POST /api/quote`；它接收 `userAddress`、`tokenIn`、`tokenOut`、`amount` 与 slippage，并返回 `path` 和 `buildResponse`。[Kuru Flow quote API](https://docs.kuru.io/api-reference/calculate-best-path-quote)

注意：SDK 当前 `amountOut` 分支仍用“输出字段更大”选择最佳 route；该字段在这个分支表示所需输入量，不能直接照搬为 Moss 的“输入最少”规则。[PathFinder 源码](https://github.com/Kuru-Labs/kuru-sdk/blob/636509c2eafd63479d3f399703354e0d09f51e18/src/router/path.ts#L57-L70)
