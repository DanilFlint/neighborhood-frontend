export interface DirectoryItem { id: string; name: string }
export interface Building { id: string; residentialComplexId: string; address: string; label: string | null }
export interface LocationSelection {
  residentialComplexId: string;
  selectionMode: 'ALL_BUILDINGS' | 'SELECTED_BUILDINGS';
  buildingIds: string[];
}
export interface Locations { primaryResidentialComplexId: string | null; selections: LocationSelection[] }
export interface Contact { type: 'TELEGRAM' | 'WHATSAPP'; value: string }
export interface Profile {
  id: string; name: string; photoUrl: string | null; about: string | null;
  primaryResidentialComplexId: string | null; additionalResidentialComplexIds: string[]; contacts: Contact[];
}
export type ProfileRequest = Pick<Profile, 'name' | 'photoUrl' | 'about' | 'contacts'>;
export interface Account { id: string; email: string; name: string }
export interface Me { profile: Profile; locations: Locations }
export interface Tokens { access_token: string; refresh_token: string; expires_in: number; username: string }
export interface ServiceSummary {
  id: string; title: string; categoryId: string; price: number;
  photoUrls: string[]; owner: { id: string; name: string };
}
export interface Service extends ServiceSummary { description: string; coverage: LocationSelection[] }
export type ServiceRequest = Omit<Service, 'id' | 'owner'>;
export interface ServicePage { items: ServiceSummary[]; page: number; size: number; totalElements: number }
export interface Search {
  categoryId?: string; residentialComplexId?: string; buildingId?: string; page?: number; size?: number;
}
export interface Registration { name: string; email: string; password: string; primaryResidentialComplexId: string }
