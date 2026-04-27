// ========================================
// LIFT PR TRACKER — Directus Connected
// ========================================

(function() {
    'use strict';

    let lifts = [];

    const liftNameInput = document.getElementById('liftName');
    const liftWeightInput = document.getElementById('liftWeight');
    const addBtn = document.getElementById('addLiftBtn');
    const list = document.getElementById('prList');
    const status = document.getElementById('dbStatus');

    function showStatus(msg) {
        status.textContent = msg;
        status.style.opacity = '1';
        setTimeout(() => status.style.opacity = '0.6', 2500);
    }

    async function loadLifts() {
        showStatus('Loading from database...');
        try {
            const data = await LiftMaxesAPI.getAll();
            if (data.error) {
                showStatus('Database error — check console');
                return;
            }
            lifts = data || [];
            renderLifts();
            showStatus(`Loaded ${lifts.length} records`);
        } catch (e) {
            console.error('Load error:', e);
            showStatus('Failed to load — check Directus permissions');
        }
    }

    async function addLift() {
        const name = liftNameInput.value.trim();
        const weight = parseFloat(liftWeightInput.value);

        if (!name || !weight || weight <= 0) {
            liftNameInput.style.animation = 'shake 0.3s ease';
            setTimeout(() => liftNameInput.style.animation = '', 300);
            return;
        }

        showStatus('Saving...');
        try {
            const res = await LiftMaxesAPI.create({ lift_name: name, weight: weight });
            if (res.error) {
                showStatus('Save failed — check console');
                return;
            }
            liftNameInput.value = '';
            liftWeightInput.value = '';
            await loadLifts();
            showStatus('Saved to database');
        } catch (e) {
            console.error('Save error:', e);
            showStatus('Failed to save');
        }
    }

    async function deleteLift(id) {
        if (!confirm('Delete this PR?')) return;
        showStatus('Deleting...');
        try {
            await LiftMaxesAPI.delete(id);
            await loadLifts();
            showStatus('Deleted');
        } catch (e) {
            console.error('Delete error:', e);
            showStatus('Failed to delete');
        }
    }

    function renderLifts() {
        if (!lifts.length) {
            list.innerHTML = `
                <div class="empty-state">
                    <span class="empty-icon">🏋️</span>
                    <p>No PRs tracked yet. Add your first lift above.</p>
                </div>
            `;
            return;
        }

        list.innerHTML = lifts.map(lift => {
            const date = lift.date_created ? new Date(lift.date_created).toLocaleDateString() : '';
            return `
                <div class="pr-card">
                    <div class="pr-lift">
                        <div class="pr-name">${escapeHtml(lift.lift_name)}</div>
                        ${date ? `<div class="pr-date">${date}</div>` : ''}
                    </div>
                    <div class="pr-weight">${lift.weight}</div>
                    <div class="pr-actions">
                        <button class="pr-btn" data-delete="${lift.id}" title="Delete">🗑</button>
                    </div>
                </div>
            `;
        }).join('');

        list.querySelectorAll('[data-delete]').forEach(btn => {
            btn.addEventListener('click', () => deleteLift(btn.dataset.delete));
        });
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    addBtn.addEventListener('click', addLift);
    liftWeightInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') addLift();
    });

    // Add shake animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-6px); }
            75% { transform: translateX(6px); }
        }
    `;
    document.head.appendChild(style);

    // Init
    loadLifts();
})();
