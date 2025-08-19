import axios from 'axios';

export interface ICompany {
    id: number;
    company_name: string;
    liked: boolean;
}

export interface ICollection {
    id: string;
    collection_name: string;
    companies: ICompany[];
    total: number;
}

export interface ICompanyBatchResponse {
    companies: ICompany[];
}

const BASE_URL = 'http://localhost:8000';

export async function getCompanies(offset?: number, limit?: number): Promise<ICompanyBatchResponse> {
    try {
        const response = await axios.get(`${BASE_URL}/companies`, {
            params: {
                offset,
                limit,
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching companies:', error);
        throw error;
    }
}

export async function getCollectionsById(id: string, offset?: number, limit?: number): Promise<ICollection> {
    try {
        const response = await axios.get(`${BASE_URL}/collections/${id}`, {
            params: {
                offset,
                limit,
            },
        });
        return response.data;
    } catch (error) {
        console.error('Error fetching companies:', error);
        throw error;
    }
}

export async function getCollectionsMetadata(): Promise<ICollection[]> {
    try {
        const response = await axios.get(`${BASE_URL}/collections`);
        return response.data;
    } catch (error) {
        console.error('Error fetching companies:', error);
        throw error;
    }
}

export async function addCompaniesToLikedCollection(companyIds: number[]): Promise<void> {
    try {
        const response = await axios.post(`${BASE_URL}/collections/add-liked`, {
            company_ids: companyIds
        });
        return response.data;
    } catch (error) {
        console.error('Error adding companies to liked collection:', error);
        throw error;
    }
}

export async function removeCompaniesFromLikedCollection(companyIds: number[]): Promise<void> {
    try {
        const response = await axios.post(`${BASE_URL}/collections/remove-liked`, {
            company_ids: companyIds
        });
        return response.data;
    } catch (error) {
        console.error('Error removing companies from liked collection:', error);
        throw error;
    }
}

export async function getLikedCollectionId(): Promise<string> {
    try {
        const response = await axios.get(`${BASE_URL}/collections/liked-id`);
        return response.data.id;
    } catch (error) {
        console.error('Error fetching liked collection ID:', error);
        throw error;
    }
}

export async function getCollectionCompanyIds(collectionId: string): Promise<number[]> {
    try {
        const response = await axios.get(`${BASE_URL}/collections/${collectionId}/company-ids`);
        return response.data.company_ids;
    } catch (error) {
        console.error('Error fetching collection company IDs:', error);
        throw error;
    }
}

export async function addCompaniesToMyList(companyIds: number[]): Promise<void> {
    try {
        const response = await axios.post(`${BASE_URL}/collections/add-my-list`, {
            company_ids: companyIds
        });
        return response.data;
    } catch (error) {
        console.error('Error adding companies to My List:', error);
        throw error;
    }
}

