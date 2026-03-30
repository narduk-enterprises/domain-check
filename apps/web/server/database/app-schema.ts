/**
 * The template app keeps the shared auth bridge schema visible here so local
 * migration generation can still see it. Downstream apps should keep
 * product-owned tables in this file and receive the bridge through sync.
 */
export * from '#server/database/auth-bridge-schema'
