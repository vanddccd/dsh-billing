#!/usr/bin/env bash
# 构建 client bundle：client/src/index.tsx → CommonJS factory（与 dsh 平台模块表格式一致）。
# 依赖 esbuild（复用 dsh checkout 里的 node_modules/.bin/esbuild）与 node_modules/@number-flow/react。
# 用法：bash scripts/build.sh [esbuild 二进制路径]
set -euo pipefail

PLUGIN_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ESBUILD="${1:-/Users/van/dev/deepseek-harness/node_modules/.bin/esbuild}"

"$ESBUILD" "$PLUGIN_DIR/client/src/index.tsx" \
  --bundle \
  --format=cjs \
  --platform=browser \
  --external:react \
  --jsx=transform \
  --jsx-factory=h \
  --jsx-fragment=Fragment \
  --loader:.css=text \
  --outfile="$PLUGIN_DIR/client.js" \
  --banner:js="function makeFactory(require){var module={exports:{}},exports=module.exports;" \
  --footer:js="return module.exports;};window.__ModuleLoader__.load({id:'dsh-billing',factory:makeFactory});"

echo "built: $PLUGIN_DIR/client.js"
