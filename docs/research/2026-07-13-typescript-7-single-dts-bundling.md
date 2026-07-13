# TypeScript 7 单文件声明打包方案调查

调查日期：2026-07-13

## Moss 工具链方案

Moss 使用 TypeScript 6.0.x，并发布编译器原生生成的多文件声明树，不执行声明 rollup。发布包只包含 `dist`，不生成 declaration map，也不额外发布 `src`。

pnpm 根据 `package.json` 的 workspace 依赖拓扑构建各包；TypeScript build config 不使用 project references。

构建直接运行 `tsc -p tsconfig.build.json`，不增加永久 clean 或增量 build 状态；CI 与正式发布使用干净 checkout。

## 结论

TypeScript 6 和 7 的 CLI 都可以生成 ESM 声明文件树，但不能原生把 ESM 包合并成单个 `.d.ts`。Moss 直接发布 TypeScript 6 生成的声明树；`package.json` 的 `exports.types` 指向 `dist/index.d.ts`，其相对引用由同目录下的其他声明文件满足。

如果单文件 `.d.ts` 是确认过的发布要求，当前最可维护的方案是职责分离：

```text
TypeScript 6 CLI --emitDeclarationOnly
  -> 临时声明文件树
  -> API Extractor dtsRollup
  -> dist/index.d.ts
  -> 使用 TypeScript 6 的消费者项目验证
```

API Extractor 不是 TS7-native 工具：当前 7.58.9 内置 TypeScript 5.9.3。推荐它是因为它成熟、专注于声明 rollup，并且不会参与 TS7 的声明生成；这仍是一条需要产物兼容测试的过渡桥梁，而不是官方承诺的 TS7 全面支持。

`tsdown` / `rolldown-plugin-dts` 已提供真实的 `tsgo` 路径，但维护者仍将它标为 experimental 且不建议生产使用。它适合 spike，不应在没有必要时替换上述基线。

## 1. `tsc` / `tsgo` 不能原生生成单文件 ESM 声明

TypeScript 的旧 [`outFile` 配置文档](https://www.typescriptlang.org/tsconfig/outFile.html)明确限定它只能配合 `None`、`System` 或 `AMD` module，不能 bundle CommonJS 或 ES6 modules。更重要的是，[TypeScript 6.0 官方公告](https://devblogs.microsoft.com/typescript/announcing-typescript-6-0/#deprecated-outfile)已经记录：`outFile` 从 TS6 起被完全移除，官方建议把 bundling 交给外部工具。TS7 继承这项移除。

因此下面两个概念不能混淆：

- `declaration: true` / `emitDeclarationOnly: true`：为输入模块生成对应的 `.d.ts` 文件；通常是一棵文件树。
- declaration rollup：解析入口、内部模块、重导出和外部类型边界，再生成一个公共 `.d.ts`；这是额外的 bundling 步骤。

[typescript-go 功能矩阵](https://github.com/microsoft/typescript-go)将 declaration emit 标为完成，但没有提供 ESM declaration rollup 功能。TS7 能可靠完成前者，不会自动完成后者。

对 Moss 而言，声明树本身是合法发布物。各包的 `exports.types` 都只暴露 `./dist/index.d.ts`，没有声明 deep exports；入口声明可以用相对路径引用同一 `dist` 目录内的内部声明。是否合并成一个文件是包形状和维护偏好，不是 TypeScript 消费者的正确性要求。

## 2. API Extractor：成熟的 rollup，但不是 TS7 编译器

[API Extractor 官方调用文档](https://api-extractor.com/pages/setup/invoking/)要求先运行 TypeScript compiler 生成 `.d.ts`，再运行 `api-extractor`。它不直接分析 TypeScript 源文件。这使声明生成和声明 rollup 可以清楚分层：TS7 负责前者，API Extractor 只消费生成物。

当前 npm `latest` 是 [`@microsoft/api-extractor` 7.58.9](https://www.npmjs.com/package/@microsoft/api-extractor/v/7.58.9)，其[一方包清单](https://raw.githubusercontent.com/microsoft/rushstack/main/apps/api-extractor/package.json)固定依赖 `typescript: 5.9.3`。官方文档也明确说明：

- API Extractor 分析项目时使用自己的 TypeScript engine，因为不同 compiler API 可能不兼容。
- `--typescript-compiler-folder` / `typescriptCompilerFolder` 只让它使用项目工具链中的 **system typings**。
- 这个选项不会把 API Extractor 的分析 engine 替换成 TS7；如果项目编译器比内置 engine 新，官方建议请求 API Extractor 升级内置 compiler。

所以“API Extractor 支持 TS7”的准确说法应是：**它在架构上可以尝试消费 TS7 CLI 生成的 `.d.ts`，但仍会用内置 TS5.9.3 parser/checker 分析这些文件。** 如果 TS7 生成了 TS5.9 无法理解的新声明语法或依赖了不同的 system typings，rollup 可能失败。不能把这条路径写成无条件兼容。

[官方 rollup 配置文档](https://api-extractor.com/pages/setup/configure_rollup/)说明，设置 `dtsRollup.enabled: true` 后可通过 `untrimmedFilePath` 指定单文件输出。其当前重要限制是每次配置假设一个 `mainEntryPointFilePath`；多入口或允许 path-based/deep imports 的包需要分别设计。

这个限制与 Moss 基本吻合：各 package 只有 `src/index.ts` 对应公开 types 入口；`@themoss/mcp-server` 虽另有 CLI JavaScript entry，但公开 types 仍指向 `dist/index.d.ts`。可以为每个 package 独立运行一次 API Extractor。

### 推荐的 API Extractor 边界

1. 用 TS7 CLI 将声明和 declaration maps 输出到临时目录，而不是让 API Extractor 接触 `.ts` 源码。
2. API Extractor 以临时目录的 `index.d.ts` 为 `mainEntryPointFilePath`，输出 `dist/index.d.ts`。
3. 固定 API Extractor 版本；不要依赖 `--typescript-compiler-folder` 来“切换到 TS7”。只有 system lib 不匹配时才使用该选项，并记录它只替换 typings。
4. 对生成 tarball 建一个使用 TypeScript 7、NodeNext、`skipLibCheck: false` 的消费者项目，导入每个公开 API 并 typecheck。
5. 如果 API Extractor 无法解析 TS7 产物，回退到原生声明树；不要因此改用实验性 `tsgo` bundler。

## 3. `tsdown` / `rolldown-plugin-dts` 的 TS7 支持仍是实验性

当前 [tsdown `DtsOptions` 文档](https://tsdown.dev/reference/api/Interface.DtsOptions#generator)列出三个 generator：

- `tsc`：只面向 TypeScript 5/6。
- `oxc`：要求源码满足 `isolatedDeclarations`。
- `tsgo`：安装 TypeScript 7 时自动选择，但标为 experimental，可能不支持全部 TypeScript 特性。

同一份文档在 [`tsgo` 选项](https://tsdown.dev/reference/api/Interface.DtsOptions#tsgo)中明确警告：TS7 尚无稳定 API，这条路径不建议用于生产，且 `tsconfigRaw`、`isolatedDeclarations` 等部分选项不可用。底层 [rolldown-plugin-dts 官方仓库](https://github.com/sxzz/rolldown-plugin-dts)给出相同边界。包清单允许 `typescript: ^7` 只能证明包管理器允许该组合，不能覆盖维护者的实验性声明。

插件还支持 [`dtsInput: true`](https://tsdown.dev/reference/api/Interface.DtsOptions#dtsInput)：可以把 TS7 CLI 已生成的 `.d.ts` 作为入口，跳过入口声明生成，再由 Rolldown bundle。这避免使用实验性 `tsgo` generator，但仍引入一个较新的声明 bundler 和 Rolldown resolution 层；对 Moss 的简单单入口包，它没有比 API Extractor 更清楚的可靠性优势。

发布隔离也是现实约束。调查时 GitHub 显示 `rolldown-plugin-dts` 的 [v0.27.7 发布于 2026-07-12](https://github.com/sxzz/rolldown-plugin-dts/releases/tag/v0.27.7)，不足 Moss 要求的 7 天 `minimumReleaseAge`。即使最终选择这条路径，也应等待候选版本满 7 天后再锁定，并重新核对届时实际解析版本。

## 4. 其他候选没有更可靠的 TS7 答案

| 候选 | 官方状态 / 实现边界 | 判断 |
| --- | --- | --- |
| **发布 TS7 声明树** | 只使用 TypeScript 7 CLI 的稳定 declaration emit | **整体最可靠**；没有单文件时最简单，也不嵌入 programmatic API |
| **API Extractor** | 成熟的单入口 rollup；自身内置 TS5.9.3 | 单文件硬要求下的**首选后处理器**，但必须验证 TS7 产物兼容 |
| **rolldown-plugin-dts + `dtsInput`** | 可消费已有 `.d.ts`；项目较新，仍经过 Rolldown 的声明解析/打包 | 可做对照 spike，当前没有比 API Extractor 更可靠的证据 |
| **tsdown / plugin + `generator: tsgo`** | TS7 路径明确标为 experimental、不建议生产 | 暂不作为生产默认方案 |
| **Oxc isolated declarations** | 不依赖 TS compiler API，但要求所有 public emit 都可隔离推导 | 架构上干净，当前 Moss 源码不满足契约 |
| **rollup-plugin-dts 6.4.1** | [官方 README](https://github.com/Swatinem/rollup-plugin-dts#maintenance-mode)称项目处于 maintenance mode，且最适合已有 `.d.ts` 输入；[peer range](https://raw.githubusercontent.com/Swatinem/rollup-plugin-dts/master/package.json)只到 TS6 | 不是 TS7-native；维护响应与支持范围不优于 API Extractor |
| **unplugin-dts** | 当前[官方源码](https://raw.githubusercontent.com/qmhc/unplugin-dts/main/packages/unplugin-dts/src/plugin.ts)直接调用 `findConfigFile`、`createProgram` 等旧 TypeScript API | 宽 peer range 不是 TS7 兼容证明；仍需要 TS6 compatibility engine |
| **dts-bundle-generator** | [官方源码](https://raw.githubusercontent.com/timocov/dts-bundle-generator/master/src/compile-dts.ts)直接调用 `createProgram` 等旧 compiler API | 同样不是 TS7-native |

目前没有发现一个同时满足以下条件的外部工具：使用 TS7 稳定 API、原生生成单文件 ESM `.d.ts`、且维护者将其声明为 production-ready。原因不是工具都“坏了”，而是 TS7.0 本身没有稳定 programmatic API；需要理解完整类型图的 bundler 暂时只能使用旧 engine、调用 `tsgo` CLI 的适配层，或要求 `isolatedDeclarations`。

### Oxc 路线的本地验证

仓库已经运行：

```sh
pnpm --no-bail -r exec tsc --noEmit --isolatedDeclarations
```

9 个 workspace 中有 7 个失败，主要诊断是导出变量、函数和方法缺少显式类型或返回类型。说明 Oxc isolated declaration 在技术上能绕开 TS7 API 空窗，但 Moss 需要先把“公开 emit 可以逐文件推导”变成源码契约。这些注解会固化公共 API 表面，应作为独立改造 review，不能当作本次升级的机械配置变更。

## 5. 对 Moss 单入口包的推荐

### 默认方案：不 bundle 声明

直接用 TypeScript 6 CLI 生成并发布：

```text
dist/index.d.ts
dist/<internal>.d.ts
```

保留 `exports.types: "./dist/index.d.ts"` 和 `files: ["dist"]`。这条路径和已经确认“不要求单文件 JavaScript”的决策一致：发布多文件 JS 与多文件声明，少一个 bundler，也少一个与 TS7 API 版本耦合的 parser。

### 只有确认必须单文件 `.d.ts` 时

采用 **TypeScript 6 CLI emit + API Extractor rollup**，不要让 API Extractor 负责声明生成。最小验收条件是：

- 每个 package 的 rollup 构建成功且没有丢失公开 export。
- TypeScript 6 消费者通过 `exports.types` 解析 tarball，并在 `skipLibCheck: false` 下 typecheck。
- 外部依赖类型保持外部引用，没有被意外内联成 Moss 的公共类型副本。
- Go to Definition 以发布的 `.d.ts` 为边界。
- API Extractor 或 TypeScript 6 更新时重跑消费者测试。

如果单文件的唯一动机是“以前 tsup 就这样产出”，不应引入 API Extractor。单文件声明的收益主要是隐藏内部声明布局、减少包内文件数和形成一个便于 review 的公共表面；它不是 ESM 包可消费性的前提。Moss 当前单入口设计让 API Extractor 成为合理的可选后处理器，但默认仍是让 TypeScript 6 原生声明树保持原样。
