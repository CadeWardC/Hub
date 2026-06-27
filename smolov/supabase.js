// ========================================
// SUPABASE API CLIENT (PostgREST)
// Drop-in replacement for the old Directus client.
// Reads config from window.SMOLOV_CONFIG (see config.js).
// Exposes the same globals: LiftMaxesAPI, SmolovPlansAPI.
// ========================================
const SUPABASE_URL = (window.SMOLOV_CONFIG && window.SMOLOV_CONFIG.SUPABASE_URL) || "";
const SUPABASE_ANON_KEY = (window.SMOLOV_CONFIG && window.SMOLOV_CONFIG.SUPABASE_ANON_KEY) || "";
const REST_URL = `${SUPABASE_URL}/rest/v1`;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    console.error("[supabase] Missing config. Create smolov/config.js from config.example.js.");
}

// Low-level request helper. Returns parsed JSON, or { error: true, ... } on failure.
async function supabaseRequest(path, method = "GET", body = null, prefer = null) {
    const url = `${REST_URL}${path}`;
    const headers = {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json"
    };
    // Ask PostgREST to return the affected rows on writes.
    if (prefer) headers["Prefer"] = prefer;

    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);

    try {
        const res = await fetch(url, opts);
        if (!res.ok) {
            const err = await res.text();
            console.error(`Supabase ${method} ${path} failed:`, res.status, err);
            return { error: true, status: res.status, message: err };
        }
        // DELETE / 204 responses may have no body.
        if (res.status === 204) return [];
        const text = await res.text();
        return text ? JSON.parse(text) : [];
    } catch (e) {
        console.error(`Supabase ${method} ${path} error:`, e);
        return { error: true, message: e.message };
    }
}

// ==================== LIFT MAXES ====================
const LiftMaxesAPI = {
    // Get all lift maxes (oldest first; the chart sorts by date itself)
    async getAll() {
        const res = await supabaseRequest("/lift_maxes?select=*&order=date_created.asc");
        if (res.error) return [];
        return Array.isArray(res) ? res : [];
    },

    // Create a new lift max -> { data: row }
    async create({ lift_name, weight }) {
        const res = await supabaseRequest("/lift_maxes", "POST", {
            lift_name,
            weight: parseInt(weight)
        }, "return=representation");
        if (res.error) return res;
        return { data: Array.isArray(res) ? res[0] : res };
    },

    // Update a lift max -> { data: row }
    async update(id, { lift_name, weight }) {
        const payload = {};
        if (lift_name !== undefined) payload.lift_name = lift_name;
        if (weight !== undefined) payload.weight = parseInt(weight);
        const res = await supabaseRequest(`/lift_maxes?id=eq.${encodeURIComponent(id)}`, "PATCH", payload, "return=representation");
        if (res.error) return res;
        return { data: Array.isArray(res) ? res[0] : res };
    },

    // Delete a lift max
    async delete(id) {
        return await supabaseRequest(`/lift_maxes?id=eq.${encodeURIComponent(id)}`, "DELETE");
    }
};

// ==================== SMOLOV PLANS ====================
const SmolovPlansAPI = {
    // Get all plans
    async getAll() {
        const res = await supabaseRequest("/smolov_plans?select=*&order=date_created.asc");
        if (res.error) return [];
        return Array.isArray(res) ? res : [];
    },

    // Get plan by lift name -> row or null
    async getByLift(lift_name) {
        const res = await supabaseRequest(`/smolov_plans?select=*&lift_name=eq.${encodeURIComponent(lift_name)}&limit=1`);
        if (res.error || !Array.isArray(res) || !res.length) return null;
        return res[0];
    },

    // Create a new plan -> { data: row }
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
        const res = await supabaseRequest("/smolov_plans", "POST", payload, "return=representation");
        if (res.error) return res;
        return { data: Array.isArray(res) ? res[0] : res };
    },

    // Update a plan -> { data: row }
    async update(id, fields) {
        const payload = {};
        for (const [key, val] of Object.entries(fields)) {
            if (val !== undefined) {
                if (["one_rm", "w2_inc", "w3_inc", "streak", "completed_days"].includes(key)) {
                    payload[key] = parseInt(val);
                } else {
                    payload[key] = val;
                }
            }
        }
        const res = await supabaseRequest(`/smolov_plans?id=eq.${encodeURIComponent(id)}`, "PATCH", payload, "return=representation");
        if (res.error) return res;
        return { data: Array.isArray(res) ? res[0] : res };
    },

    // Mark a day complete (increments completed_days, updates streak)
    async markDayComplete(id, { completed_days, streak, last_completed_date }) {
        return await this.update(id, { completed_days, streak, last_completed_date });
    },

    // Delete a plan
    async delete(id) {
        return await supabaseRequest(`/smolov_plans?id=eq.${encodeURIComponent(id)}`, "DELETE");
    }
};
