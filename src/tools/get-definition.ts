import { getDefinition } from '../definitions/store.js'

export async function handleGetDefinition(term: string) {
    const definition = await getDefinition(term)
    return { definition }
}
