# Protocol adapters use standard decorators with runtime-injected, ABI-generic Handles

Protocol adapters are authored as classes with standard decorators (`@Protocol`, `@Capability`, `@Query`) — specifically the TypeScript 5+ `(value, context)` semantics, not legacy `experimentalDecorators`. This is not a builder API or a codegen pipeline. The `@Protocol` decorator injects contract Handles at construction time; `declare pool: Handle<typeof PoolAbi>` is a type-only declaration whose method signatures are inferred from the const ABI via abitype/viem. There is no custom compiler step.

## Considered Options

- **Builder API (`defineProtocol({...})`)** — more idiomatic in the 2026 TS ecosystem and gives inference for free, but abandons the class/decorator authoring UX the project was designed around.
- **Codegen** — perfect typing from ABIs, but adds a compile toolchain that every contributor must understand and we must maintain.
- **Decorators with bare (untyped) `Handle`** — rejected: `this.pool.supply(...)` degrades to `any`, so contributor mistakes surface at simulate time instead of in the IDE, undermining Moss's own safety story.

## Consequences

- Handles MUST be declared with their ABI type parameter (`Handle<typeof PoolAbi>`), otherwise calls are untyped. The ABI is referenced twice (in `@Protocol` config and in the `declare` type); the compiler cannot check they agree, so `@Protocol` validates at registration time that declared handle fields match the `contracts` config keys and throws on mismatch.
- Requires TypeScript 5+ standard decorators. `experimentalDecorators` / reflect-metadata is explicitly off the table.
- Decorator metadata is attached as symbol-keyed **marker properties** on the class and its method functions, not via `context.metadata`: `Symbol.metadata` lowering is still uneven across transpilers (esbuild, oxc), while marker properties compile identically everywhere. The registry discovers methods by walking the prototype chain for markers.
- Toolchain constraint (reverified 2026-07-13): Node 22 does not parse standard decorator syntax natively, so every path that executes decorated source must lower it first. Package builds use the TypeScript 6 CLI with an explicit ES2022 target; TypeScript 7 is deferred until its new toolchain has had more ecosystem soak time. Tests use Vitest 4 with Vite 7/esbuild explicitly pinned and an ES2022 transform target. Vite 8/Oxc remains a future option once native decorator lowering exists or the project accepts and verifies a Babel/SWC workaround. The invariant is the lowering behavior, not a permanent pin to tsup or a particular Vitest major.
- A Handle does exactly two things: `handle.fn(...)` encodes calldata locally (never sends), and `handle.read.fn(...)` performs a read-only RPC call. Signing and sending are outside the Handle's power — and outside Moss entirely.
