# TypeScript 7 与标准装饰器工具链调查

调查日期：2026-07-13

## Moss 工具链方案

Moss 使用 **TypeScript 6.0.x**，依赖范围为 `~6.0.0`。构建在 Node 22+ 上直接运行 `tsc`，输出多文件 ESM、声明与 source maps，不使用 tsup。测试链使用 Vitest 4 和显式锁定的 Vite 7；依赖版本必须经过 7 天发布隔离。

发布包只包含 `dist`，不额外发布 `src`。JavaScript source map 启用 `inlineSources`，使调试器可以从 `.js.map` 读取原始 TypeScript；不生成 declaration map，类型跳转以发布的 `.d.ts` 为边界。

工作区构建由 pnpm 按 `package.json` 中的依赖关系拓扑执行：根构建使用 `pnpm -r --sort build`，定向构建使用 `pnpm --filter <package>... build` 将依赖包含在内。每个发布包维护自己的 `tsconfig.build.json`；不使用 TypeScript project references，不维护第二套包依赖图。

构建脚本不提供永久 clean 步骤，直接执行 `tsc -p tsconfig.build.json`。CI 与正式发布从不含 `dist` 的干净 checkout 开始；已有工作目录从 tsup 切换时只需一次性删除旧 `dist`，避免遗留的 bundler chunk 混入本地产物。

CI 将发布产物消费者测试设为必过项：构建并打包各 workspace package，在临时 Node 22 + TypeScript 6 项目中以 `skipLibCheck: false` 检查类型，执行公开 API，并验证 `moss-mcp` CLI 入口。

## 结论

是的。截至调查日，npm `latest` 是 **TypeScript 7.0.2**，而最新稳定版继续支持 TypeScript 5.0 引入的标准装饰器调用约定，即装饰器接收 `(value, context)`。官方 [TypeScript 7.0 公告](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/) 已宣布 7.0 可用于生产，[npm 的 `latest` 元数据](https://registry.npmjs.org/typescript/latest) 指向 7.0.2；TypeScript 5.0 的官方说明则记录了该装饰器模型的语法、类型和 emit 行为。

但这**不能解除 Moss 当前测试链对“必须有工具 lowering 装饰器”的约束**，也不能靠升级 TypeScript 自动解除 Vitest 3 pin：

- `tsc` 能检查并 emit 标准装饰器，但 Moss 的日常类型检查是 `tsc --noEmit`，不会产生供测试执行的 JavaScript；参见本仓库的 [tsconfig](../../packages/core/tsconfig.json) 和 [package scripts](../../packages/core/package.json)。
- Vitest 使用 Vite 的转换管线，而不是调用 `tsc` 来转换测试文件；这是 [Vitest 官方架构说明](https://vitest.dev/guide/why.html) 明确记录的行为。
- 当前 `Vitest 3 -> Vite 7 -> esbuild(target: es2022)` 会 lowering 装饰器；本仓库的 [Vitest 配置](../../packages/core/vitest.config.ts) 正在显式提供这个 target。
- `Vitest 4` 并不等于 `Vite 8`。稳定版 Vitest 4.1.10 的[一方包清单](https://raw.githubusercontent.com/vitest-dev/vitest/v4.1.10/packages/vitest/package.json)允许 Vite 6、7 或 8，因此“升级 Vitest 4，同时显式锁定 Vite 7”是可行候选路径。
- 一旦解析到 Vite 8，JavaScript 转换器会从 esbuild 换成 Oxc；[Vite 8 官方迁移文档](https://vite.dev/guide/migration)明确说明 Oxc 尚不能 lowering 标准装饰器，必须暂用 Babel/SWC，或等待 [Oxc #9170](https://github.com/oxc-project/oxc/issues/9170)。
- TypeScript 5.9 pin 是另一条独立约束：`tsup --dts` 与 TypeScript 6/7 的兼容，而不是装饰器支持。TypeScript 7 又没有稳定 programmatic API，所以它比原文只提到的“等待 tsup 支持 TS 6”更需要单独规划。

因此，贡献文档不应把因果关系写成“TypeScript 不支持装饰器，所以锁 Vitest 3”。准确规则是：**任何会把源码交给 Node 的 build/test/run 路径，都必须先通过一个支持标准装饰器 lowering 的转换器。**

## TypeScript 7 的稳定性与当前生态兼容基线

TypeScript 7.0 不是 beta 或 RC。截至 2026-07-13，官方已经发布 7.0，[npm `latest`](https://registry.npmjs.org/typescript/latest) 指向 **7.0.2**。但“官方稳定”不等于“所有嵌入 TypeScript 的工具都已经完成迁移”：7.0 换成了新的 Go 原生实现，而且[官方明确说明 7.0 不提供稳定 programmatic API](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-60)，依赖 compiler/language-service API 的工具仍需使用 TypeScript 6 compatibility package；新的 API 预计到 7.1 才提供。

因此应区分三个版本答案：

| 问题 | 截至调查日的答案 | 理由 |
| --- | --- | --- |
| **官方最新稳定版** | **TypeScript 7.0.2** | 正式发布且位于 npm `latest`；CLI、类型检查和 emit 是稳定产品面 |
| **当前主流生态兼容基线** | **[TypeScript 6.0.3](https://www.npmjs.com/package/typescript?activeTab=versions)** | 仍提供原有 JS compiler API；typescript-eslint、Angular 22、Svelte/Astro 等当前工具链集中在 6.0.x |
| **Moss 当前无迁移改动的可靠版本** | **TypeScript 5.9.3** | 当前 `tsup --dts` 在 TS6 上仍有 `baseUrl` 兼容问题，TS7 又没有它所需的旧 API |

Moss 没有 Vue/Angular/Svelte/Astro 这类嵌入式编译器，而且使用 Biome 而非 typescript-eslint。当前采用 TypeScript 6.0.x；TypeScript 7 的 CLI、API 和生态迁移情况作为未来升级的评估依据。

### 与 Moss 相关及典型生态工具的兼容矩阵

这里把 peer range、独立解析器和真实 compiler API 兼容分开。peer range 很宽，只说明包管理器允许安装，不能证明工具能够调用 TS7 已移除的旧 API。

| 工具 | 官方声明或实现边界 | 与 TS7 的实际关系 |
| --- | --- | --- |
| **Vite / Vitest** | [Vite 自己用 Oxc 转译 TS、明确不做类型检查](https://vite.dev/guide/features)；[Vitest 复用 Vite 转换管线](https://vitest.dev/guide/why.html)。Vitest 4.1.10 的 [Vite peer range](https://raw.githubusercontent.com/vitest-dev/vitest/v4.1.10/packages/vitest/package.json) 是 `^6 || ^7 || ^8` | 不嵌入 TypeScript compiler API，没有“支持到 TS 几”的 peer 边界；TS7 只影响另外运行的 `tsc`。装饰器能否 lowering 仍由实际 Vite transformer 决定 |
| **esbuild / tsx** | [esbuild 使用自己的 TS parser，只转译、不检查类型或生成 `.d.ts`](https://esbuild.github.io/content-types/)；[tsx 直接使用 esbuild](https://tsx.is/typescript) | 不依赖已安装的 TypeScript compiler API；安装 TS7 不会让它们改用 TS7，也通常不会被 TS7 API 变化阻塞 |
| **Biome** | 当前 Moss 使用 2.5.2；npm 最新 2.5.3 的[官方包元数据](https://www.npmjs.com/package/%40biomejs/biome?activeTab=versions)显示零依赖，Biome 也明确使用自己的 parser/LSP、无需 Node | 不依赖 TypeScript compiler API，因而没有 TS5/6/7 peer 限制；但它自己的语法和类型感知能力不能当作 `tsc` 等价物 |
| **tsdown / rolldown-plugin-dts** | [tsdown 0.22.x](https://raw.githubusercontent.com/rolldown/tsdown/main/package.json) 与 [plugin 0.27.x](https://raw.githubusercontent.com/sxzz/rolldown-plugin-dts/main/package.json) 的 manifest 允许 `typescript: ^5 || ^6 || ^7`；DTS 文档在安装 TS7 时选择 `generator: "tsgo"` | 是少数有 TS7 路径的工具，但[官方仍把 `tsgo` generator 标为 experimental 且不建议生产使用](https://tsdown.dev/reference/api/Interface.DtsOptions#tsgo)，部分选项不可用；peer range 本身不是成熟度证明 |
| **typescript-eslint** | 官方支持范围是 [`>=4.8.4 <6.1.0`](https://typescript-eslint.io/users/dependency-versions/)，开放的 peer 只用于试验新版本 | 当前正式支持到 TS6，不支持 TS7；它是典型 compiler API consumer，需要 TS6 compatibility package 或等待适配 |
| **Vue / Volar / vue-tsc** | vue-tsc 3.3.7 的 [peer range 是 `>=5.0.0`](https://raw.githubusercontent.com/vuejs/language-tools/master/packages/tsc/package.json)，且 Vue 官方说明它是 [`tsc` 的封装](https://vuejs.org/guide/typescript/overview.html) | 宽 peer range 会允许 TS7，但 [TS7 官方公告](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#typescript-and-embedded-languages)明确说明 Vue/Volar 这类嵌入式语言工具目前仍需 TS6；所以不能把 `>=5` 解读为 TS7 已适配 |
| **Angular** | Angular 22 的[官方兼容表](https://angular.dev/reference/versions)要求 `>=6.0.0 <6.1.0` | 明确只支持 TS6.0.x，不支持 TS7；Angular roadmap 也说明其 compiler 深度嵌入 TypeScript |
| **Astro** | Astro 7 当前[一方 manifest](https://raw.githubusercontent.com/withastro/astro/main/packages/astro/package.json)用 TypeScript 6.0.3 开发；[TS7 官方公告](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#typescript-and-embedded-languages)把 Astro 列为暂时不能利用 TS7 的 embedded-language workflow | 普通 `.ts` 仍可单独跑 TS7 CLI，但 Astro language server/`astro check` 不能据此视为 TS7-ready，稳妥基线是 TS6 |
| **Svelte / svelte-check** | svelte-check 4.7.1 的 peer 写成 `typescript >=5`，但 [svelte-language-server 的真实 peer](https://raw.githubusercontent.com/sveltejs/language-tools/master/packages/language-server/package.json)是 `^5.9.2 || ^6.0.2`，[`svelte2tsx`](https://raw.githubusercontent.com/sveltejs/language-tools/master/packages/svelte2tsx/package.json)也只列到 TS6 | 顶层宽 peer 同样不能证明 TS7 支持；language server 和转换层当前正式边界到 TS6 |
| **API Extractor** | 当前 7.58.9 的[官方 manifest](https://raw.githubusercontent.com/microsoft/rushstack/main/apps/api-extractor/package.json)固定内置 `typescript: 5.9.3` | 它读取已有 `.d.ts` 并用内置 TS 分析，不是 TS7 declaration emitter，也没有使用 TS7 新 API；处理 TS7 产物仍需单独兼容测试 |
| **tsup 8.5.1** | manifest 的 TypeScript peer 是宽泛的 [`>=4.5.0`](https://raw.githubusercontent.com/egoist/tsup/v8.5.1/package.json)，但 DTS 源码会 [`import ts from "typescript"` 并调用 compiler API](https://raw.githubusercontent.com/egoist/tsup/v8.5.1/src/rollup.ts) | JS bundle 的 esbuild 半边不受 TS7 API 影响；`--dts` 半边不能直接使用 TS7。它在 TS6 上还有 `baseUrl` 问题，所以 Moss 当前仍需 5.9.3 或迁移 DTS 构建 |

矩阵揭示的主线是：**Vite、Vitest、esbuild、tsx、Biome 这类自带 parser/transformer 的工具不是 Moss 升 TS7 的主要阻塞项；真正的阻塞项是 `tsup --dts` 以及其他直接嵌入 TypeScript compiler/language-service API 的工具。**

## 术语校正：当前不应再称为 Stage 3

TC39 的 [Decorators proposal README](https://github.com/tc39/proposal-decorators) 顶部当前标记为 **Stage 2.7**，TC39 的[提案总表](https://github.com/tc39/proposals)也将 Decorators 列在 Stage 2.7。该 README 较后面的 FAQ，以及 TypeScript、Node 等旧文档仍保留“Stage 3”的历史措辞；判断当前阶段应以提案顶部和总表为准，不宜从旧措辞推导它现在仍是 Stage 3。

Moss 更精确的术语应是：

> **standard decorators（TypeScript 5+ 的 `(value, context)` / 2022-03 语义族）**

“2022-03”也是转换器生态用于区分装饰器语义快照的版本名；例如 Babel 的[官方 7.19 公告](https://babeljs.io/blog/2022/09/05/7.19.0/)用 `version: "2022-03"` 指定这一模型。这里强调“语义族”，是因为当前 TC39 提案仍是 work in progress，不能把 TypeScript 5 时实现的快照无条件等同于未来最终 ECMAScript 文本。

## TypeScript 到底支持了哪一层

[TypeScript 5.0 官方公告](https://devblogs.microsoft.com/typescript/announcing-typescript-5-0/)说明它实现了新的标准装饰器模型，并展示了 `(originalMethod, context)`、`ClassMethodDecoratorContext` 与 `addInitializer`。同一文档还明确区分两种模式：不启用 `experimentalDecorators` 时使用新模型；启用时使用旧的 experimental/legacy 模型，两者的类型检查和 emit 不同。

TypeScript 7 是原编译器的 Go 原生移植。其[官方发布公告](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/)和 [typescript-go 功能矩阵](https://github.com/microsoft/typescript-go)记录了解析、类型检查、JavaScript emit 与 declaration emit 均已实现；标准装饰器转换器也存在于[官方编译器源码](https://github.com/microsoft/typescript-go/blob/main/internal/transformers/estransforms/esdecorator.go)。所以最新稳定版的答案不是“只会解析”：它能检查，也能在需要时 emit lowering 后的 JavaScript。

不过 `tsc` 是否保留 `@decorator`，取决于 emit target。TypeScript 的 [`target` 文档](https://www.typescriptlang.org/tsconfig/target.html)说明 target 决定哪些新语法需要降级。调查时用 TypeScript 7.0.2 和本仓库 Node 22.23.1 做了最小验证：

| 编译配置 | 结果 |
| --- | --- |
| 标准 class decorator，`target: ES2023` | 输出包含 `__esDecorate`，Node 22 可执行 |
| 相同源码，`target: ESNext` | 输出保留 `@mark`，Node 22 报 `SyntaxError` |
| 相同的二参数 decorator，开启 `experimentalDecorators` | 报 TS1238，因为编译器改按只传旧式 class target 的 legacy 签名检查 |

这与 Node 官方文档相符：Node 22.23.1 的 [TypeScript 支持说明](https://nodejs.org/docs/latest-v22.x/api/typescript.html)明确写明装饰器不会被 Node 转换，并会导致 parser error。该页面仍把阶段写成 Stage 3，是术语过时，不影响它关于 Node 行为的结论。

所以应区分三个命题：

1. **TypeScript 语言/类型系统支持标准装饰器：是。**
2. **`tsc` 可以 lowering：是，但只有真正执行 emit 且 target 要求 lowering 时。**
3. **Node/V8 能直接解析带 `@` 的输出：否；当前仍需预转换。**

## Moss 当前各条管线

```text
类型检查   .ts -> tsc --noEmit                         -> 不产生运行产物
包构建     .ts -> tsup -> esbuild(target es2022)       -> Node 可解析的 JS
声明构建   .ts -> tsup --dts -> TypeScript compiler API -> .d.ts
测试       .ts -> Vitest 3 -> Vite 7 -> esbuild(es2022) -> Node
```

### 包构建：tsup/esbuild

tsup 官方仓库将自身描述为 [powered by esbuild](https://github.com/egoist/tsup)。Moss 的各包又在 build script 中显式传入 `--target es2022`，例如 [`@moss/core`](../../packages/core/package.json)。esbuild 的[官方语法表](https://esbuild.github.io/content-types/)把 decorators 标为 `esnext`，并说明当配置 target 低于该语法级别时会条件转换。因此当前包构建不会把原始 `@decorator` 交给 Node。

tsx 同样属于 esbuild 路径；其[官方仓库](https://github.com/privatenumber/tsx)将 esbuild 列为核心技术。它是否安全同样取决于实际转换配置和输出，而不是工作区安装了哪个 TypeScript 版本。

### 测试：Vitest 3 / Vite 7 / esbuild

当前 lockfile 解析为 Vitest 3.2.6 与 Vite 7.3.6，参见本仓库的 [pnpm-lock.yaml](../../pnpm-lock.yaml)。Vite 7.3.6 的[一方包清单](https://raw.githubusercontent.com/vitejs/vite/v7.3.6/packages/vite/package.json)依赖 esbuild，其[转换插件源码](https://raw.githubusercontent.com/vitejs/vite/v7.3.6/packages/vite/src/node/plugins/esbuild.ts)显示开发转换的默认 target 是 `esnext`。

这条 Vite/esbuild 路径是 transpile-only：esbuild 的[官方 TypeScript 说明](https://esbuild.github.io/content-types/)明确说它只解析并删除类型，不做 type checking，建议另行运行 `tsc --noEmit`。因此把工作区的 TypeScript 从 5.9 升到 7.0，不会把 Vite 的转换器替换为 `tsc`，也不会改变测试时 decorator 是否被 lowering。

这解释了为什么 Moss 各 `vitest.config.ts` 的 `esbuild: { target: "es2022" }` 不是装饰性配置：它覆盖默认 `esnext`，迫使 esbuild 真正 lowering decorators。esbuild 还明确说明 `tsconfig.compilerOptions.target` **不会**设置 esbuild 自己的 target，只影响 class-fields 默认语义；参见其[官方 TypeScript caveats](https://esbuild.github.io/content-types/)。所以只把 `tsconfig.base.json` 设成 ES2023 并不足以替代 Vitest 配置中的 target。

### Vitest 4 / Vite 8 / Oxc

截至调查日，最新稳定 Vitest 是 [4.1.10](https://github.com/vitest-dev/vitest/releases/tag/v4.1.10)。Vitest 4 的[迁移指南](https://vitest.dev/guide/migration)要求 Vite >= 6 和 Node >= 20；其 4.1.10 包清单允许 `vite` 的 `^6.0.0 || ^7.0.0 || ^8.0.0`。因此 Vitest major 与 Vite major 不必绑定升级。

Vite 8 的情况不同：[官方迁移文档](https://vite.dev/guide/migration)说明：

- Vite 8 用 Rolldown/Oxc 取代 Rollup/esbuild；
- 顶层 `esbuild` 选项只是向 Oxc 的兼容映射，Vite 不再直接用 esbuild 做 JavaScript transform；
- Oxc 当前不 lowering 标准装饰器；
- 官方临时方案是 `@rolldown/plugin-babel` + `@babel/plugin-proposal-decorators`，或 `@rollup/plugin-swc` + `@swc/core`，示例都指定 `2023-11` 装饰器版本。

由于 Vitest 复用 Vite 的插件转换管线，把官方 Babel/SWC workaround 放入 Vitest/Vite 配置在架构上可行；这是基于两份官方文档作出的推论，仍应通过一个 decorator smoke test 和全套测试验证，而不能只看依赖安装成功。

## 为什么 `experimentalDecorators` 必须保持关闭

`experimentalDecorators` 不是“允许使用 `@`”的通用开关。TypeScript 5.0 起，不开它也可以使用标准 decorators；开启它反而选择旧提案的 legacy 调用约定。TypeScript 官方[差异说明](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-0.html)指出两种模式的 type-check 与 emit 不同，标准模型也不支持 legacy 的参数装饰器和 `emitDecoratorMetadata`。

esbuild 的行为完全一致：其[官方文档](https://esbuild.github.io/content-types/)写明，`experimentalDecorators` 为 true 时使用 TypeScript legacy behavior；缺省或 false 时使用标准 JavaScript decorator behavior。Moss 的 decorator 接收 `(value, context)`，因此开启该选项会改变运行时 ABI，而非修复兼容性。

## TypeScript 6/7 与 `tsup --dts`：独立问题

Moss 的 JavaScript 构建和声明构建必须分开看。esbuild 会丢弃类型且不生成 `.d.ts`；其[官方限制说明](https://esbuild.github.io/content-types/)明确要求声明文件由 TypeScript 等其他工具生成。tsup 因此用 esbuild 构建 JavaScript，同时让 `--dts` 路径使用 TypeScript compiler API。

TypeScript 6 已暴露一个具体冲突：tsup 8.5.1 在 DTS 构建时无条件注入 `baseUrl`，触发 TS5101。复现、注入源码和版本都记录在仍开放的 [tsup #1388](https://github.com/egoist/tsup/issues/1388)；修复 [PR #1390](https://github.com/egoist/tsup/pull/1390)截至调查日仍未合并。tsup 自己的 README 也已注明[项目不再积极维护，并建议考虑 tsdown](https://github.com/egoist/tsup)。

TypeScript 7 又增加了一层约束：[官方 7.0 公告](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/#running-side-by-side-with-typescript-60)明确说明 7.0 **不提供稳定 programmatic API**，依赖 compiler API 的工具需要并行使用 `@typescript/typescript6` compatibility package；预计新 API 到 7.1 才提供。因此：

- 升级到 TS 6：可以研究 `ignoreDeprecations: "6.0"`、pnpm patch tsup，或迁移 DTS 工具；这仍需完整 build/typecheck 验证。
- 升级到 TS 7：不能简单把 `typescript` 依赖改成 7.0.2；至少要拆分 TS7 CLI 与供 API 工具使用的 TS6 compatibility package，或替换 `tsup --dts`。
- 以上都不改变 Vitest/Vite 的 decorator lowering 行为，因而也不会自动解除 Vitest pin。

## `tsup` 有支持 TypeScript 7 的替代品吗？

有，但必须先把“支持 TypeScript 7”拆成两项验收条件：

1. **JavaScript 产物**：能输出可发布的 ESM，并把 Moss 的 standard decorators lowering 到 ES2022；是否必须 bundle 是另一项产品选择。
2. **声明产物**：能生成 `.d.ts`，而且不能假装 TypeScript 7 仍提供 TypeScript 6 的 `ts.Program` / `ts.createProgram` API。

按这个定义，截至调查日，没有一个无需额外配置、可以原样替换 Moss 当前 `tsup ... --dts --target es2022` 命令的单一工具。最接近的是 `tsdown`，但它的两个半边目前各有一个需要显式处理的限制：JavaScript 侧的 Rolldown/Oxc 不能 lowering standard decorators，TypeScript 7 声明侧虽已有 `tsgo` 路径，却仍被维护者标为 experimental。

### 当前 Moss 实际需要的构建能力

Moss 的构建需求相对克制：全部是 ESM，通常只有 `src/index.ts` 一个公开入口；`@themoss/mcp-server` 另有 `src/cli.ts`。当前命令确实会 bundle、externalize package dependencies，并生成 source map、ES2022 JavaScript 和 `.d.ts`，但仓库文档、exports 和源码中没有发现“发布物必须是单文件 JavaScript bundle”的约束。没有 CJS、CSS、非 TypeScript assets、minify 或浏览器多目标构建。

所有内部相对 import 已使用 `.js` 扩展，package dependencies 可以原样保留为外部 import，`files: ["dist"]` 又会发布整个输出树。因此首先应验证最简单的单编译器方案；只有单文件 bundle 被确认是实际需求时，才保留 bundler：

```text
采用：src/*.ts -> TypeScript 6 tsc(target ES2022) -> dist/*.js + *.d.ts + JS maps

若必须 bundle：
src/*.ts -> esbuild(target es2022)                 -> dist/*.js + maps
src/*.ts -> TypeScript 7 tsc --emitDeclarationOnly -> dist/*.d.ts + maps
```

### 候选结论

| 候选 | JavaScript bundle / decorator lowering | TypeScript 7 `.d.ts` | 对 Moss 的判断 |
| --- | --- | --- | --- |
| **直接 TypeScript 7 `tsc`** | 不 bundle；TS7 CLI 可 emit ES2022 JS 并 lowering standard decorators | 同一次 CLI 构建直接 emit，不需要 programmatic API | **首选验证路径**；当前未发现 Moss 必须 bundle 的理由 |
| **esbuild + TypeScript 7 `tsc`** | esbuild 可以 bundle，并支持 standard decorator lowering | 由 TS7 CLI 直接 `--emitDeclarationOnly`，不需要 programmatic API | **必须保留 JS bundle 时的推荐路径**；声明默认是文件树 |
| **tsdown 0.22.x** | 能 bundle，但官方明确说 Rolldown/Oxc 尚不能 lowering standard decorators | `dts.generator: "tsgo"` 可调用 TS7，安装 TS7 时会自动选择；目前标为 experimental | 最接近 tsup 的替代品，但 Moss 必须额外接 Babel/SWC，并做产物验证 |
| **tsdown + Oxc isolated declarations** | 同上，decorator 仍需额外 transformer | 不用 TypeScript API，但源码必须满足 `isolatedDeclarations` | 技术上可绕开 TS7 API；Moss 当前还不满足该约束 |
| **rolldown-plugin-dts** | 它只负责声明；配套 Rolldown 仍有 decorator 限制 | 0.27.x 有 `generator: "tsgo"`，TS7 时自动选择；仍标 experimental | 可作为 tsdown 底层或独立 spike，不比直接 `tsc` 更稳妥 |
| **unplugin-dts** | 可挂到 esbuild 等 bundler，但自身只解决声明 | 当前实现直接使用 `ts.Program`、`ts.CompilerHost` 等旧 API | **不是真正的 TS7 方案**；只能给它另配 TS6 compatibility alias |
| **API Extractor** | 不生成 JavaScript | 消费已有 `.d.ts` 并 roll up；自身固定依赖 TypeScript 5.9.3 | 可作为可选后处理器，但不是 TS7 declaration emitter，也不是 tsup 替代品 |

### 1. Moss 构建：直接用 TypeScript 6 CLI emit JS 和声明

TypeScript 7 的限制是“不提供可供 JavaScript 工具嵌入的 API”，不是 CLI 不能 emit。官方 [TypeScript 7 功能矩阵](https://github.com/microsoft/typescript-go)将 JavaScript emit 和 declaration emit 都标为完成；前面的 TS7.0.2 最小实验也确认 `target: ES2023` 会把 standard decorators 转成 `__esDecorate`，而 `ESNext` 才会保留原始 `@`。ES2022 同样要求 lowering。

对 Moss 来说，直接 `tsc` 有几个具体优势：

- 一次构建同时生成 JavaScript、`.d.ts` 和带内嵌源码的 JavaScript source map。
- package dependencies 保留为 ESM imports，天然 external；不需要再维护 bundler external 规则。
- `src/index.ts` 中的 `.js` 相对引用与 NodeNext 输出吻合，`files: ["dist"]` 会把被入口引用的内部模块一并发布。
- standard decorator 的类型检查和 runtime emit 由同一版 TypeScript 6 完成，减少 transformer 语义漂移。

调查时还用当前 TypeScript 5.9 对全部 7 个 workspace/package-template 入口做了同构构建验证：以 `target: ES2022` 直接 emit JS、`.d.ts` 和两类 map 均无诊断；装饰器使用点输出为 `__esDecorate`，`@themoss/mcp-server` 的 `index.js` 与 `cli.js` 也都正确生成。这个测试证明了源码布局不依赖 bundling，但它**不是 TS7 全仓验证**；实施时仍须使用 TS7 重跑 build、tests 和消费者测试。

代价是产物从“每个入口一个 bundle”变为“每个源码模块一个 JS/声明文件”。这不是语义缺陷，但会改变 tarball 文件数、stack trace 和内部模块布局，所以应通过打包快照确认团队是否接受。仓库目前没有 deep exports，消费者仍只能通过 `exports` 访问公开入口。

落地使用专用 `tsconfig.build.json`：只包含 `src`，覆盖当前 typecheck config 的 `noEmit: true`，设置 `rootDir: "src"`、`outDir: "dist"`、`target: "ES2022"`、`declaration: true`、`sourceMap: true`、`inlineSources: true` 和 `declarationMap: false`。发布清单继续只包含 `dist`。

### 2. 必须保留 JavaScript bundle 时：esbuild + TypeScript 7 CLI

如果单文件 JavaScript、tree-shaking 后的包形状或 CLI 冷启动被确认是硬要求，再采用职责分离的两段式构建：

- [esbuild 官方 TypeScript 文档](https://esbuild.github.io/content-types/)说明它负责 transpile/bundle、支持 standard decorator 转换，但不做类型检查也不生成声明。
- [TypeScript 7 官方仓库的功能矩阵](https://github.com/microsoft/typescript-go)将 declaration emit 标为完成；[TypeScript 官方配置文档](https://www.typescriptlang.org/tsconfig/#emitDeclarationOnly)定义了 `emitDeclarationOnly`，它正是给“JavaScript 由 Babel/esbuild 等其他转换器产生”的分工方式。
- TypeScript 7 的限制是“不提供可供 JavaScript 工具嵌入的 API”，不是“CLI 不能生成声明”。直接运行 `tsc` 不经过那套缺失的 API。

声明不必天然 bundle 成一个文件。Moss 的 `package.json` 只要求 `dist/index.d.ts` 是入口；`tsc` 可以同时输出 `dist/index.d.ts` 和它引用的 `dist/decorators.d.ts`、`dist/types.d.ts` 等文件。调查时已用当前 TypeScript 5.9 对 `@themoss/core` 做了同构验证：`src/index.ts` 可直接 emit 为一棵合法声明树，入口中的 `./decorators.js` 等引用会由 TypeScript 按 NodeNext 规则解析到对应声明文件。这个本地验证证明了产物布局可行，但**不替代后续使用 TS7 跑全仓、打包 tarball 并做消费者测试**。

落地时应增加专用的 declaration build config，只包含 `src`，覆盖当前用于 typecheck 的 `noEmit: true`，并设置 `rootDir: "src"`、`outDir: "dist"`、`emitDeclarationOnly: true`。JavaScript 一侧直接调用 esbuild，保持 `bundle`、ESM、`target: es2022`、source map 和 dependencies external。这样 TypeScript 7 的升级面只在 `tsc` 命令，不再被一个嵌入旧 compiler API 的包装器阻塞。

### 3. `tsdown`：确实认识 TypeScript 7，但对 Moss 不是无配置替换

`tsdown` 是 tsup README 自己推荐的后继候选，也是活跃维护的 Rolldown 官方生态项目。当前 [tsdown 包清单](https://raw.githubusercontent.com/rolldown/tsdown/main/package.json)的 TypeScript peer range 已包含 `^7.0.0`，它内部使用 `rolldown-plugin-dts`。

声明侧已经有真实的 TS7 路径，而不只是一个宽松的 peer range：[tsdown 的 `DtsOptions.generator` 文档](https://tsdown.dev/reference/api/Interface.DtsOptions#generator)列出 `"tsgo"`，并说明安装 TypeScript 7 时会自动选择它。底层 [rolldown-plugin-dts 文档](https://github.com/sxzz/rolldown-plugin-dts)也说明 TypeScript 7 会默认使用 `tsgo` 生成并 bundle 声明。不过同一份文档明确把这条路径标为 experimental，且提醒部分选项不可用，因此目前只能称为“有 TS7 支持路径”，不能称为“已证明适合 Moss 的生产替换”。

JavaScript 侧还有与 TypeScript 版本无关的硬缺口：[tsdown 的 target 文档](https://tsdown.dev/options/target#decorator-support)明确说明 Rolldown/Oxc 当前不能转换 standard decorators。把现有命令机械地改为 `tsdown --target es2022 --dts` 会把 Moss 所依赖的 decorator lowering 丢掉。要选 tsdown，必须同时按 Vite 8 官方同类方案接入 Babel 或 SWC decorator transform，并通过 runtime smoke test 证明输出语义与 TypeScript/esbuild 路径一致。

所以 tsdown 适合做后续 spike：

```text
tsdown/Rolldown bundle
  + Babel 或 SWC standard-decorator transform
  + dts.generator = "tsgo"
```

它的优点是仍保留一个 library-bundler 层和单文件 `.d.ts`；代价是同时引入新的 bundler、新的 decorator transformer 和 experimental TS7 declaration adapter。对 Moss 这类简单 ESM 包，这个组合目前比直接 esbuild + `tsc` 更复杂。

### 4. Oxc isolated declarations：不依赖 TS7 API，但需要改源码契约

`tsdown` 的另一条声明路径是在 `isolatedDeclarations` 开启时用 Oxc 直接生成 `.d.ts`。这不需要 TypeScript compiler API，因此从架构上避开了 TS7 7.0 的 API 空窗；[tsdown 官方 DTS 文档](https://tsdown.dev/options/dts)明确区分了 Oxc 路径和未开启时回退 TypeScript compiler 的路径。

它不是免费切换。调查时用仓库当前 TypeScript 5.9 对所有包开启 `--isolatedDeclarations` 做了只读检查，源码共出现 **31 个**诊断，集中在导出变量缺少显式类型和公开方法缺少显式返回类型；`@themoss/mcp-server` 已通过，其余包与协议模板均有待补注解。这个数量看起来可控，但添加公开类型注解会固化 API 表面，应单独 review，而不应当作为“升级 TypeScript”的隐式机械修改。

即使完成这些注解，Oxc 路径也只解决 declaration emit；JavaScript 的 standard decorator lowering 缺口仍然存在。

### 5. `unplugin-dts`、API Extractor 与其他 DTS bundler 为什么不是答案

`unplugin-dts` 虽然可挂到 esbuild、Vite、Rollup、Rolldown 等工具上，但其[当前官方源码](https://raw.githubusercontent.com/qmhc/unplugin-dts/main/packages/unplugin-dts/src/plugin.ts)直接调用 `ts.findConfigFile`、创建 program，并在[选项 API](https://raw.githubusercontent.com/qmhc/unplugin-dts/main/docs/en/options.md)中暴露 `ts.Program`、`ts.CompilerHost` 和 `ts.Diagnostic`。它的 `typescript: ">=4"` peer range 不能改变 TS7 7.0 没有这些 API 的事实。用官方 TS6 compatibility alias 可以让它运行，但那代表声明仍由 TS6 API 生成，不是 TS7-native 方案。

API Extractor 的定位是读取已有声明并生成 `.d.ts` rollup；[官方示例](https://api-extractor.com/pages/overview/demo_rollup/)也把 TypeScript 的逐文件声明列为其输入。当前 [API Extractor 包清单](https://raw.githubusercontent.com/microsoft/rushstack/main/apps/api-extractor/package.json)固定依赖 TypeScript 5.9.3。它可以作为 TypeScript 7 CLI emit 之后的可选 rollup 步骤，但需要验证 TS7 输出语法能否被它内置的 5.9 parser 接受，且它仍不解决 JavaScript bundle。因此 Moss 没有单文件声明的硬需求时，不值得先引入。

`rollup-plugin-dts` 和 `dts-bundle-generator` 也不能消除该问题：前者当前 peer range只到 TypeScript 6，并明确通过 TypeScript 做模块解析；后者[官方源码](https://raw.githubusercontent.com/timocov/dts-bundle-generator/master/src/compile-dts.ts)直接调用 `ts.createProgram`、`ts.createIncrementalCompilerHost` 等 API。它们可以处理 TS7 CLI 预先生成的简单 `.d.ts` 输入的可能性需要另行验证，但都不是 TS7-native declaration generator。

### 推荐迁移顺序

1. **先用 TypeScript 6 CLI 直接 emit JS 和声明**；增加只包含 `src` 的 build config，不引入新 bundler。
2. 对每个包检查 `dist` 形状、运行时 decorator smoke test、全套测试，并从生成的 tarball 建一个最小消费者项目验证 `exports.types`、NodeNext resolution 和 CLI entry。
3. 如果测试或明确需求证明必须保留 JavaScript bundle，再切换为 esbuild bundle + TypeScript 6 `--emitDeclarationOnly`。
4. 只有确认“单文件 `.d.ts`”也是实际发布需求时，再评估 API Extractor 或 `rolldown-plugin-dts` 后处理；否则保留 TypeScript 原生声明树。
5. 若团队更看重单一 bundler 命令，再做 `tsdown + Babel/SWC + tsgo dts` spike。它应与第一条稳定基线比较产物和运行行为，而不是直接替换。

因此，对“有没有支持 TS7 的 tsup 替代品”的最短答案是：**有，tsdown 已有 TS7/tsgo 声明路径；但由于 Moss 使用 standard decorators，它还不是 drop-in replacement。Moss 当前甚至可能不再需要 bundler：首选是直接 TypeScript 7 CLI；若必须保留 bundle，再用 esbuild + TypeScript 7 CLI。**

## 可行升级路径

| 路径 | 装饰器转换 | 风险与要求 | 判断 |
| --- | --- | --- | --- |
| 保持 Vitest 3 + Vite 7 | esbuild，保留 `target: es2022` | 继续承担旧 major 与安全维护成本；至少可升到仍发布的 3.2.7 | 最低短期改动 |
| **Vitest 4 + 显式 Vite 7 pin** | esbuild，保留 `target: es2022` | Vitest 4 有独立 breaking changes；必须确认 lockfile 只解析到预期 Vite 7，并跑全套测试 | **最值得先做的升级 spike** |
| Vitest 4 + Vite 8 + Babel/SWC | Babel 或 SWC plugin | 按 Vite 官方配置；核验 2023-11 runtime 与 Moss 的 TS 类型模型、插件顺序、coverage/source map | 可行，但复杂度更高 |
| 等待 Vite 8/Oxc 原生 lowering | Oxc | 跟踪 Oxc #9170；实现发布后仍需 smoke test，不能仅凭 issue closed 移除保护 | 最少长期 workaround，时间未知 |

第一条关键结论是：**可以先解除“Vitest 必须是 3.x”这一过强约束，而无需同时接受 Vite 8。** Vitest 4.1.10 明确支持 Vite 7。真正应该被锁定和测试的是“Vite 的实际 transformer 能否 lowering 标准 decorators”。

测试链使用 **Vitest 4 + 显式 Vite 7 pin**。Vite 8 的 Babel/SWC workaround 技术上可行，但当前不增加第二套 decorator transformer。解除 Vite 7 pin 的前提是 Oxc 原生 lowering，或替代转换器通过运行时 smoke test。

第二条关键结论是：TypeScript 升级应另开迁移工作，先解决 `tsup --dts` 与 TS7 API 分层；不要把它与 Vitest/Oxc 的 runtime-transform 问题合并成一个版本锁。

## 建议的贡献文档表述

> Moss 使用 standard decorators（TypeScript 5+ 的 `(value, context)` / 2022-03 语义族；TC39 当前为 Stage 2.7），并保持 `experimentalDecorators` 关闭。Node 目前不能解析未转换的 decorator syntax，因此 build、test 和直接执行 TypeScript 的每条路径都必须使用已验证的 decorator-lowering transformer。当前 Vite 7 路径依赖 esbuild 并显式设置 `target: es2022`。升级 Vitest 时可以使用 Vitest 4 + Vite 7；升级到 Vite 8 则必须先配置并验证 Babel/SWC workaround，或等待 Oxc 原生 lowering。
>
> TypeScript 版本锁与上述 runtime transform 约束相互独立。tsup 8.5.1 的 `--dts` 在 TypeScript 6 上存在未合并的兼容修复，而 TypeScript 7.0 又不提供稳定 compiler API；升级前必须先完成 DTS 工具链迁移或 TS6 compatibility package 分层。
