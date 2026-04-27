// ========================================
// DIRECTUS API CLIENT
// ========================================
const DIRECTUS_URL = "https://api.opcw032522.uk";
const DIRECTUS_TOKEN = "fEBSFMbY4SywZ_2kXx1t5ziXAOm7L8LE";

async function directusRequest(path, method = "GET", body = null) {
    const sep = path.includes('?') ? '&' : '?';
    const url = `${DIRECTUS_URL}${path}${sep}access_token=${DIRECTUS_TOKEN}`;
    const headers = {
        "Content-Type": "application/json"
    };
    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    try {
        const res = await fetch(url, opts);
        if (!res.ok) {
            const err = await res.text();
            console.error(`Directus ${method} ${path} failed:`, res.status, err);
            return { error: true, status: res.status, message: err };
        }
        return await res.json();
    } catch (e) {
        console.error(`Directus ${method} ${path} error:`, e);
        return { error: true, message: e.message };
    }
}

// ==================== LIFT MAXES ====================
const LiftMaxesAPI = {
    // Get all lift maxes
    async getAll() {
        const res = await directusRequest("/items/Lift_Maxes");
        if (res.error) return [];
        return res.data || [];
    },

    // Create a new lift max
    async create({ lift_name, weight }) {
        return await directusRequest("/items/Lift_Maxes", "POST", {
            lift_name,
            weight: parseInt(weight)
        });
    },

    // Update a lift max
    async update(id, { lift_name, weight }) {
        const payload = {};
        if (lift_name !== undefined) payload.lift_name = lift_name;
        if (weight !== undefined) payload.weight = parseInt(weight);
        return await directusRequest(`/items/Lift_Maxes/${id}`, "PATCH", payload);
    },

    // Delete a lift max
    async delete(id) {
        return await directusRequest(`/items/Lift_Maxes/${id}`, "DELETE");
    }
};

// ==================== SMOLOV PLANS ====================
const SmolovPlansAPI = {
    // Get all plans (should be 1 per user typically)
    async getAll() {
        const res = await directusRequest("/items/Smolov_Plans");
        if (res.error) return [];
        return res.data || [];
    },

    // Get plan by lift name
    async getByLift(lift_name) {
        const res = await directusRequest(`/items/Smolov_Plans?filter[lift_name][_eq]=${encodeURIComponent(lift_name)}`);
        if (res.error || !res.data || !res.data.length) return null;
        return res.data[0];
    },

    // Create a new plan
    async create({ lift_name, one_rm, w2_inc = 10, w3_inc = 20, completed_days = 0, streak = 0, last_completed_date = null }) {
        const payload = {
            lift_name,
            one_rm: parseInt(one_rm),
            w2_inc: parseInt(w2_inc),
            w3_inc: parseInt(w3_inc),
            completed_days: parseInt(completed_days),
            streak: parseInt(streak),
            last_completed_date
        };
        return await directusRequest("/items/Smolov_Plans", "POST", payload);
    },

    // Update a plan
    async update(id, fields) {
        const payload = {};
        for (const [key, val] of Object.entries(fields)) {
            if (val !== undefined) {
                if (["one_rm", "w2_inc", "w3_inc", "completed_days", "streak"].includes(key)) {
                    payload[key] = parseInt(val);
                } else {
                    payload[key] = val;
                }
            }
        }
        return await directusRequest(`/items/Smolov_Plans/${id}`, "PATCH", payload);
    },

    // Mark a day as completed (increments completed_days, updates streak)
    async markDayComplete(id, { completed_days, streak, last_completed_date }) {
        return await this.update(id, { completed_days, streak, last_completed_date });
    },

    // Delete a plan
    async delete(id) {
        return await directusRequest(`/items/Smolov_Plans/${id}`, "DELETE");
    }
};
