import { buildCanonicalSearchPath, readDomainRouteQuery } from '#shared/domainSearch'

export async function useDomainSearchPageRoute() {
  const route = useRoute()
  const config = useRuntimeConfig()

  const query = computed(() =>
    readDomainRouteQuery({
      label: route.params.label,
      domain: route.params.domain,
      q: route.query.q,
    }),
  )
  const canonicalPath = computed(() => buildCanonicalSearchPath(query.value))
  const hasLegacyQuery = computed(
    () => typeof route.query.q === 'string' || Array.isArray(route.query.q),
  )
  const needsRedirect = computed(() => route.path !== canonicalPath.value || hasLegacyQuery.value)
  const canonicalUrl = computed(() => new URL(canonicalPath.value, config.public.appUrl).toString())

  if (needsRedirect.value) {
    await navigateTo(
      canonicalPath.value,
      import.meta.server ? { redirectCode: 301 } : { replace: true },
    )
  }

  return {
    query,
    canonicalPath,
    canonicalUrl,
  }
}
