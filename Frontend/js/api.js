// API Configuration
const API_BASE_URL = 'http://localhost:5000/api';

// API Functions
const RoofAPI = {
    // Get all roofs
    async getAllRoofs() {
        try {
            const response = await fetch(`${API_BASE_URL}/roof`);
            if (!response.ok) throw new Error('API Error');
            return await response.json();
        } catch (error) {
            console.error('Error fetching roofs:', error);
            return [];
        }
    },

    // Get specific roof
    async getRoofById(id) {
        try {
            const response = await fetch(`${API_BASE_URL}/roof/${id}`);
            if (!response.ok) throw new Error('API Error');
            return await response.json();
        } catch (error) {
            console.error(`Error fetching roof ${id}:`, error);
            return null;
        }
    },

    // Create new roof
    async createRoof(roofData) {
        try {
            const response = await fetch(`${API_BASE_URL}/roof`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(roofData)
            });
            if (!response.ok) throw new Error('API Error');
            return await response.json();
        } catch (error) {
            console.error('Error creating roof:', error);
            return null;
        }
    },

    // Update roof
    async updateRoof(id, roofData) {
        try {
            const response = await fetch(`${API_BASE_URL}/roof/${id}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(roofData)
            });
            if (!response.ok) throw new Error('API Error');
            return await response.json();
        } catch (error) {
            console.error(`Error updating roof ${id}:`, error);
            return null;
        }
    },

    // Delete roof
    async deleteRoof(id) {
        try {
            const response = await fetch(`${API_BASE_URL}/roof/${id}`, {
                method: 'DELETE'
            });
            return response.ok;
        } catch (error) {
            console.error(`Error deleting roof ${id}:`, error);
            return false;
        }
    }
};
