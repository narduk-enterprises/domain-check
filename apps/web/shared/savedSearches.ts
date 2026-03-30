export interface SavedSearchRecord {
  id: string
  query: string
  normalizedQuery: string
  createdAt: string
  updatedAt: string
}

export interface SavedSearchListResponse {
  savedSearches: SavedSearchRecord[]
}
