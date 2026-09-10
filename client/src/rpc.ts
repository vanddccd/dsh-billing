/** 宿主 RPC 调用（POST /billing/<endpoint>）。 */
export async function rpc(endpoint: string, args?: unknown): Promise<any> {
  let response: Response
  try {
    response = await fetch(`/billing/${endpoint}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        type: 'client-request',
        rpcId:
          typeof crypto !== 'undefined' && crypto.randomUUID
            ? crypto.randomUUID()
            : `billing-${Date.now()}-${Math.random()}`,
        method: endpoint,
        payload: args === undefined ? {} : { args },
      }),
    })
  } catch (error) {
    throw new Error(`billing/${endpoint} 网络错误：${error instanceof Error ? error.message : String(error)}`)
  }
  const body: any = await response.json().catch(() => ({}))
  if (body.result?.ok) return body.result.value
  throw new Error(body.result?.error?.message ?? `billing/${endpoint} HTTP ${response.status}`)
}
