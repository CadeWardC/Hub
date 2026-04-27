// ========================================
// SMOLOV JR. CALCULATOR - 3 WEEK PROTOCOL
// Connected to Directus database
// ========================================

(function() {
    'use strict';

    // --- State ---
    let currentUnit = 'lb';
    let weeklyIncrement = 10;
    let rawMax = 0;
    let workingMax = 0;
    let program = [];
    let currentDayIndex = 0;
    let planId = null;
    let completedDays = 0;
    let streak = 0;
    let lastCompleted = null;
    let isSaving = false;
    let selectedLift = 'Squat';
    let undoTimer = null;
    let undoState = null; // { prevIndex, prevCompletedDays, prevStreak, prevLastCompleted }
    let liftPlans = {};
    let activeLift = null;

    // --- DOM refs ---
    const setupScreen = document.getElementById('setupScreen');
    const mainApp = document.getElementById('mainApp');
    const oneRmInput = document.getElementById('oneRm');
    const trainingMaxCb = document.getElementById('useTrainingMax');
    const startBtn = document.getElementById('startBtn');
    const unitBtns = document.querySelectorAll('.unit-btn');
    const incBtns = document.querySelectorAll('.inc-btn');
    const setupUnitLabel = document.getElementById('setupUnitLabel');
    const loadingScreen = document.getElementById('loadingScreen');
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');
    const liftBtns = document.querySelectorAll('.lift-btn');
    const liftLabel = document.getElementById('liftLabel');
    const customLiftWrap = document.getElementById('customLiftWrap');
    const customLiftInput = document.getElementById('customLiftInput');

    // --- Directus Integration ---
    async function loadPlanFromDirectus() {
        loadingScreen?.classList.remove('hidden');
        setupScreen.classList.add('hidden');
        mainApp.classList.add('hidden');

        if (typeof SmolovPlansAPI === 'undefined') {
            loadingScreen?.classList.add('hidden');
            setupScreen.classList.remove('hidden');
            return;
        }

        try {
            const plans = await SmolovPlansAPI.getAll();
            if (plans && plans.length > 0) {
                // Build liftPlans map (one per lift, most recent wins)
                liftPlans = {};
                plans.forEach(plan => {
                    const name = plan.lift_name || 'Unknown';
                    if (!liftPlans[name] || new Date(plan.date_created) > new Date(liftPlans[name].date_created)) {
                        liftPlans[name] = plan;
                    }
                });

                // Pick most recently created plan as active
                const sorted = plans.sort((a, b) => new Date(b.date_created) - new Date(a.date_created));
                const plan = sorted[0];
                const startLift = plan.lift_name || 'Squat';

                activeLift = startLift;
                selectedLift = startLift;
                planId = plan.id;
                rawMax = plan.one_rm;
                weeklyIncrement = plan.w2_inc || 10;
                streak = plan.streak || 0;
                lastCompleted = plan.last_completed_date;
                completedDays = typeof plan.completed_days === 'number' ? plan.completed_days : 0;

                workingMax = trainingMaxCb.checked ? Math.round(rawMax * 0.9) : rawMax;
                program = buildProgram(workingMax, currentUnit, weeklyIncrement);
                currentDayIndex = Math.min(completedDays, program.length - 1);

                loadingScreen?.classList.add('hidden');
                mainApp.classList.remove('hidden');
                renderAll();
                renderLiftTabs();
                showDbStatus('Plans loaded');
            } else {
                loadingScreen?.classList.add('hidden');
                setupScreen.classList.remove('hidden');
            }
        } catch (e) {
            console.error('Failed to load plan:', e);
            loadingScreen?.classList.add('hidden');
            setupScreen.classList.remove('hidden');
        }
    }

    async function savePlanToDirectus() {
        if (typeof SmolovPlansAPI === 'undefined' || isSaving) return;
        isSaving = true;
        showDbStatus('Saving...');
        
        try {
            const payload = {
                lift_name: selectedLift,
                one_rm: rawMax,
                w2_inc: weeklyIncrement,
                w3_inc: weeklyIncrement * 2,
                completed_days: completedDays,
                streak: streak,
                last_completed_date: lastCompleted
            };
            
            if (planId) {
                await SmolovPlansAPI.update(planId, payload);
                showDbStatus('Plan saved to database');
            } else {
                const res = await SmolovPlansAPI.create(payload);
                if (res && res.data && res.data.id) {
                    planId = res.data.id;
                    showDbStatus('Plan created in database');
                }
            }

            // Update local liftPlans map
            liftPlans[selectedLift] = {
                ...(liftPlans[selectedLift] || {}),
                id: planId,
                lift_name: selectedLift,
                one_rm: rawMax,
                w2_inc: weeklyIncrement,
                w3_inc: weeklyIncrement * 2,
                completed_days: completedDays,
                streak: streak,
                last_completed_date: lastCompleted,
                date_created: (liftPlans[selectedLift] && liftPlans[selectedLift].date_created) || new Date().toISOString()
            };
            activeLift = selectedLift;
            renderLiftTabs();
        } catch (e) {
            console.error('Failed to save plan:', e);
            showDbStatus('Save failed — check console');
        } finally {
            isSaving = false;
        }
    }

    async function markDayComplete() {
        if (currentDayIndex >= program.length - 1) return;

        // Snapshot for undo
        undoState = {
            prevIndex: currentDayIndex,
            prevCompletedDays: completedDays,
            prevStreak: streak,
            prevLastCompleted: lastCompleted
        };

        const today = program[currentDayIndex];
        if (today.type !== 'rest' && today.type !== 'test') {
            completedDays++;
            const todayStr = new Date().toISOString().split('T')[0];
            if (lastCompleted) {
                const last = new Date(lastCompleted);
                const now = new Date(todayStr);
                const diff = Math.floor((now - last) / (1000 * 60 * 60 * 24));
                if (diff === 1) streak++;
                else if (diff > 1) streak = 1;
            } else {
                streak = 1;
            }
            lastCompleted = todayStr;
        }

        currentDayIndex++;
        renderAll();
        showUndoState();

        await savePlanToDirectus();
    }

    async function undoLastComplete() {
        if (!undoState) return;
        currentDayIndex = undoState.prevIndex;
        completedDays = undoState.prevCompletedDays;
        streak = undoState.prevStreak;
        lastCompleted = undoState.prevLastCompleted;
        clearUndoState();
        renderAll();
        await savePlanToDirectus();
    }

    function showUndoState() {
        const card = document.getElementById('upNextCard');
        const hint = document.getElementById('upNextHint');
        if (!card) return;
        card.classList.add('completed');
        if (hint) hint.textContent = 'Tap to undo';
        if (undoTimer) clearTimeout(undoTimer);
        undoTimer = setTimeout(clearUndoState, 3000);
    }

    function clearUndoState() {
        const card = document.getElementById('upNextCard');
        const hint = document.getElementById('upNextHint');
        if (card) card.classList.remove('completed');
        if (hint) hint.textContent = 'Tap to mark today complete';
        if (undoTimer) { clearTimeout(undoTimer); undoTimer = null; }
        undoState = null;
    }

    function handleUpNextTap() {
        // If program complete, no-op
        if (currentDayIndex >= program.length - 1) return;
        if (undoState) {
            undoLastComplete();
        } else {
            markDayComplete();
        }
    }

    function showDbStatus(msg) {
        const el = document.getElementById('dbStatus');
        if (el) {
            el.textContent = msg;
            el.style.opacity = '1';
            setTimeout(() => { el.style.opacity = '0.6'; }, 2000);
        }
    }

    function renderLiftTabs() {
        const container = document.getElementById('liftTabs');
        if (!container) return;
        container.innerHTML = '';

        const lifts = Object.keys(liftPlans).sort();
        lifts.forEach(lift => {
            const btn = document.createElement('button');
            btn.className = 'lift-tab-btn' + (lift === activeLift ? ' active' : '');
            btn.textContent = lift;
            btn.onclick = () => switchLift(lift);
            container.appendChild(btn);
        });

        const addBtn = document.createElement('button');
        addBtn.className = 'lift-tab-add';
        addBtn.textContent = '+ Add';
        addBtn.onclick = showAddLift;
        container.appendChild(addBtn);
    }

    function switchLift(liftName) {
        if (liftName === activeLift) return;
        const plan = liftPlans[liftName];
        if (!plan) return;

        activeLift = liftName;
        selectedLift = liftName;
        planId = plan.id;
        rawMax = plan.one_rm;
        weeklyIncrement = plan.w2_inc || 10;
        completedDays = typeof plan.completed_days === 'number' ? plan.completed_days : 0;
        streak = plan.streak || 0;
        lastCompleted = plan.last_completed_date;

        workingMax = trainingMaxCb.checked ? Math.round(rawMax * 0.9) : rawMax;
        program = buildProgram(workingMax, currentUnit, weeklyIncrement);
        currentDayIndex = Math.min(completedDays, program.length - 1);
        undoState = null;
        clearUndoState();

        renderAll();
        renderLiftTabs();

        // Reset sub-tabs to Today
        tabBtns.forEach(b => b.classList.remove('active'));
        tabPanels.forEach(p => p.classList.remove('active'));
        document.querySelector('[data-tab="today"]')?.classList.add('active');
        document.getElementById('todayTab')?.classList.add('active');
    }

    function showAddLift() {
        oneRmInput.value = '';
        selectedLift = 'Squat';
        syncLiftButtons();
        document.getElementById('cancelSetupBtn')?.classList.remove('hidden');
        mainApp.classList.add('hidden');
        setupScreen.classList.remove('hidden');
    }

    function hideAddLift() {
        setupScreen.classList.add('hidden');
        mainApp.classList.remove('hidden');
        document.getElementById('cancelSetupBtn')?.classList.add('hidden');
    }

    // --- Unit Toggle ---
    unitBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            unitBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentUnit = btn.dataset.unit;
            setupUnitLabel.textContent = currentUnit;
            updateIncLabels();
            if (program.length) renderAll();
        });
    });

    function updateIncLabels() {
        const labels = { '10': currentUnit === 'lb' ? '+10 lb' : '+10 kg', '5': currentUnit === 'lb' ? '+5 lb' : '+5 kg', '15': currentUnit === 'lb' ? '+15 lb' : '+15 kg' };
        incBtns.forEach(btn => {
            btn.textContent = labels[btn.dataset.inc] || `+${btn.dataset.inc} ${currentUnit}`;
        });
    }

    // --- Increment Toggle ---
    incBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            incBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            weeklyIncrement = parseInt(btn.dataset.inc);
        });
    });

    // --- Lift Picker ---
    liftBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            liftBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (btn.dataset.lift === 'other') {
                customLiftWrap?.classList.remove('hidden');
                customLiftInput?.focus();
                selectedLift = customLiftInput?.value.trim() || '';
                if (liftLabel) liftLabel.textContent = selectedLift || '…';
            } else {
                customLiftWrap?.classList.add('hidden');
                selectedLift = btn.dataset.lift;
                if (liftLabel) liftLabel.textContent = selectedLift;
            }
        });
    });

    if (customLiftInput) {
        customLiftInput.addEventListener('input', () => {
            selectedLift = customLiftInput.value.trim();
            if (liftLabel) liftLabel.textContent = selectedLift || '…';
        });
    }

    function syncLiftButtons() {
        const knownLifts = ['Squat', 'Bench', 'Deadlift', 'Overhead Press', 'Barbell Row', 'Front Squat'];
        const isKnown = knownLifts.includes(selectedLift);
        liftBtns.forEach(b => {
            if (b.dataset.lift === 'other') {
                b.classList.toggle('active', !isKnown);
            } else {
                b.classList.toggle('active', b.dataset.lift === selectedLift);
            }
        });
        if (!isKnown) {
            customLiftWrap?.classList.remove('hidden');
            if (customLiftInput) customLiftInput.value = selectedLift;
        } else {
            customLiftWrap?.classList.add('hidden');
        }
        if (liftLabel) liftLabel.textContent = selectedLift;
    }

    // --- Start Program ---
    startBtn.addEventListener('click', startProgram);
    oneRmInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') startProgram();
    });

    async function startProgram() {
        const val = parseFloat(oneRmInput.value);
        if (!val || val <= 0) {
            shakeInput();
            return;
        }
        if (!selectedLift) {
            customLiftInput?.focus();
            return;
        }
        rawMax = val;
        workingMax = trainingMaxCb.checked ? Math.round(val * 0.9) : val;

        program = buildProgram(workingMax, currentUnit, weeklyIncrement);
        currentDayIndex = 0;
        completedDays = 0;
        streak = 0;
        lastCompleted = null;

        // If replacing an existing lift, keep its planId so savePlanToDirectus updates it
        const existing = liftPlans[selectedLift];
        if (existing) {
            planId = existing.id;
        } else {
            planId = null;
        }

        setupScreen.classList.add('hidden');
        mainApp.classList.remove('hidden');
        // Return to Today tab
        tabBtns.forEach(b => b.classList.remove('active'));
        tabPanels.forEach(p => p.classList.remove('active'));
        document.querySelector('[data-tab="today"]')?.classList.add('active');
        document.getElementById('todayTab')?.classList.add('active');
        renderAll();
        
        // Auto-save new plan to Directus
        await savePlanToDirectus();

        // Log starting max to Lift_Maxes
        if (typeof LiftMaxesAPI !== 'undefined') {
            try {
                await LiftMaxesAPI.create({ lift_name: selectedLift, weight: rawMax });
            } catch (e) {
                console.error('Failed to log starting max:', e);
            }
        }
    }

    function shakeInput() {
        const wrap = document.querySelector('.setup-input-wrap');
        wrap.style.animation = 'none';
        wrap.offsetHeight;
        wrap.style.animation = 'shake 0.4s ease';
        setTimeout(() => wrap.style.animation = '', 400);
    }

    // --- Tab Switching ---
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;
            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            tabPanels.forEach(p => p.classList.remove('active'));
            document.getElementById(tab + 'Tab').classList.add('active');
            if (tab === 'maxes') loadAndRenderMaxes();
        });
    });

    // --- Weight Math ---
    function roundW(w) {
        if (currentUnit === 'lb') return Math.round(w / 5) * 5;
        return Math.round(w / 2.5) * 2.5;
    }

    function pct(p) { return roundW(workingMax * (p / 100)); }

    // --- Program Builder ---
    function buildProgram(max, unit, increment) {
        const sessions = [];
        let dayNum = 0;

        const add = (week, dayLabel, phase, phaseIdx, scheme, weight, type, sets, note) => {
            dayNum++;
            sessions.push({
                dayNum,
                week,
                dayLabel,
                phase,
                phaseIdx,
                scheme,
                weight,
                type: type || 'workout',
                sets: sets || [],
                note: note || ''
            });
        };

        const w1 = {
            d1: { sets: Array.from({length:6}, (_,i) => ({s:i+1, r:6, w:pct(70)})), scheme: '6×6 @ 70%' },
            d2: { sets: Array.from({length:7}, (_,i) => ({s:i+1, r:5, w:pct(75)})), scheme: '7×5 @ 75%' },
            d3: { sets: Array.from({length:8}, (_,i) => ({s:i+1, r:4, w:pct(80)})), scheme: '8×4 @ 80%' },
            d4: { sets: Array.from({length:10}, (_,i) => ({s:i+1, r:3, w:pct(85)})), scheme: '10×3 @ 85%' }
        };

        const w2offset = unit === 'lb' ? increment : roundW(increment / 2.2);
        const w2 = {
            d1: { sets: w1.d1.sets.map(s => ({...s, w: roundW(s.w + w2offset)})), scheme: `6×6 @ 70% + ${increment} ${unit}` },
            d2: { sets: w1.d2.sets.map(s => ({...s, w: roundW(s.w + w2offset)})), scheme: `7×5 @ 75% + ${increment} ${unit}` },
            d3: { sets: w1.d3.sets.map(s => ({...s, w: roundW(s.w + w2offset)})), scheme: `8×4 @ 80% + ${increment} ${unit}` },
            d4: { sets: w1.d4.sets.map(s => ({...s, w: roundW(s.w + w2offset)})), scheme: `10×3 @ 85% + ${increment} ${unit}` }
        };

        const w3offset = unit === 'lb' ? increment * 2 : roundW((increment * 2) / 2.2);
        const w3 = {
            d1: { sets: w1.d1.sets.map(s => ({...s, w: roundW(s.w + w3offset)})), scheme: `6×6 @ 70% + ${increment*2} ${unit}` },
            d2: { sets: w1.d2.sets.map(s => ({...s, w: roundW(s.w + w3offset)})), scheme: `7×5 @ 75% + ${increment*2} ${unit}` },
            d3: { sets: w1.d3.sets.map(s => ({...s, w: roundW(s.w + w3offset)})), scheme: `8×4 @ 80% + ${increment*2} ${unit}` },
            d4: { sets: w1.d4.sets.map(s => ({...s, w: roundW(s.w + w3offset)})), scheme: `10×3 @ 85% + ${increment*2} ${unit}` }
        };

        const weekData = [w1, w2, w3];
        const dayLabels = ['Mon', 'Wed', 'Fri', 'Sat'];
        const dayKeys = ['d1', 'd2', 'd3', 'd4'];

        for (let w = 0; w < 3; w++) {
            const wk = weekData[w];
            for (let d = 0; d < 4; d++) {
                const day = wk[dayKeys[d]];
                add(w+1, dayLabels[d], 'Smolov Jr.', 0, day.scheme, day.sets[0].w, 'workout', day.sets);
            }
        }

        add(4, 'Mon–Thu', 'Deload', 1, 'Rest', null, 'rest', [], 'Rest 4–7 days. No lifting. Eat, sleep, recover.');
        add(4, 'Fri/Sat', 'Test', 1, 'Test new 1RM', null, 'test', [], 'Work up to a new max. Rest 3–5 min between heavy singles.');

        return sessions;
    }

    // --- Render Everything ---
    function renderAll() {
        renderProgress();
        renderToday();
        renderWeek();
        renderProgram();
    }

    function renderProgress() {
        const today = program[currentDayIndex];
        document.getElementById('currentPhase').textContent = `Week ${today.week}`;
        document.getElementById('currentDay').textContent = `Day ${today.dayNum} of 12`;
        const pct = Math.round((currentDayIndex / (program.length - 1)) * 100);
        document.getElementById('progressFill').style.width = pct + '%';
    }

    function renderToday() {
        const today = program[currentDayIndex];
        const next = program[currentDayIndex + 1];

        document.getElementById('todayBadge').textContent = `Day ${today.dayNum} of 12`;
        document.getElementById('todayTitle').textContent = `Week ${today.week} — ${selectedLift} — ${today.dayLabel}`;

        const card = document.getElementById('todayWorkout');

        if (today.type === 'rest') {
            card.className = 'workout-card rest';
            card.innerHTML = `
                <div class="workout-main">
                    <div class="workout-label">Today</div>
                    <div class="workout-scheme">Rest Day</div>
                    <div class="workout-at">Recovery is part of training</div>
                    <div class="workout-weight">Rest</div>
                </div>
                <div class="warmup-note">${today.note || 'Take the day off. Foam roll, stretch, eat well, sleep 8+ hours.'}</div>
            `;
        } else if (today.type === 'test') {
            card.className = 'workout-card test';
            card.innerHTML = `
                <div class="workout-main">
                    <div class="workout-label">Today</div>
                    <div class="workout-scheme">1RM Test</div>
                    <div class="workout-at">Work up to a new max</div>
                    <div class="workout-weight">Test</div>
                </div>
                <div class="warmup-note"><strong>Warmup:</strong> Bar×10, 40%×5, 50%×3, 60%×2, 70%×1, 80%×1, 85%×1, 90%×1, then attempt new 1RM. Rest 3–5 min between heavy singles.</div>
            `;
        } else {
            card.className = 'workout-card';
            const wUnit = currentUnit;
            const setsHtml = today.sets.map(s => `
                <div class="set-row">
                    <span class="set-num">Set ${s.s}</span>
                    <span class="set-detail">${s.r} <span class="set-reps">reps</span> @ <strong>${s.w} ${wUnit}</strong></span>
                </div>
            `).join('');

            card.innerHTML = `
                <div class="workout-main">
                    <div class="workout-label">Workout</div>
                    <div class="workout-scheme">${today.scheme}</div>
                    <div class="workout-at">working weight</div>
                    <div class="workout-weight">${today.weight}<span class="workout-unit">${wUnit}</span></div>
                </div>
                <div class="workout-sets">
                    ${setsHtml}
                </div>
                <div class="warmup-note"><strong>Warmup:</strong> Bar×10, ${Math.round(today.weight*0.4)}${wUnit}×5, ${Math.round(today.weight*0.6)}${wUnit}×3, ${Math.round(today.weight*0.75)}${wUnit}×2</div>
            `;
        }

        // Up Next
        const upNext = document.getElementById('upNextCard');
        const upNextHint = document.getElementById('upNextHint');
        if (next) {
            const nextWeight = next.type === 'workout' ? `${next.weight} ${currentUnit}` : (next.type === 'rest' ? 'Rest' : 'Test Day');
            upNext.innerHTML = `
                <div class="up-next-info">
                    <span class="up-next-day">Week ${next.week} — ${next.dayLabel}</span>
                    <span class="up-next-scheme">${next.scheme}</span>
                </div>
                <span class="up-next-weight">${nextWeight}</span>
            `;
            upNext.setAttribute('tabindex', '0');
            upNext.setAttribute('aria-disabled', 'false');
            if (upNextHint) {
                upNextHint.style.display = '';
                if (!undoState) upNextHint.textContent = 'Tap to mark today complete';
            }
        } else {
            upNext.innerHTML = `
                <div class="up-next-info">
                    <span class="up-next-day">Program Complete</span>
                    <span class="up-next-scheme">You finished Smolov Jr.!</span>
                </div>
            `;
            upNext.setAttribute('tabindex', '-1');
            upNext.setAttribute('aria-disabled', 'true');
            upNext.classList.remove('completed');
            if (upNextHint) upNextHint.style.display = 'none';
        }

        // Show test-day max logger on test day or when fully complete
        const testDayCard = document.getElementById('testDayCard');
        if (testDayCard) {
            if (today.type === 'test' || currentDayIndex >= program.length - 1) {
                testDayCard.classList.remove('hidden');
                document.getElementById('testDayMaxInput')?.focus();
            } else {
                testDayCard.classList.add('hidden');
            }
        }
    }

    // --- Week View ---
    function renderWeek() {
        const today = program[currentDayIndex];
        const weekNum = today.week <= 3 ? today.week : 4;

        document.getElementById('weekTitle').textContent = `Week ${weekNum}`;

        const weekSessions = program.filter(s => s.week === weekNum);
        const phase = weekNum <= 3 ? 'Smolov Jr.' : (weekNum === 4 ? 'Deload / Test' : '');
        document.getElementById('weekPhase').textContent = phase;

        const container = document.getElementById('weekDays');
        container.innerHTML = weekSessions.map(s => {
            const isActive = s.dayNum === today.dayNum;
            const isRest = s.type === 'rest';
            const isTest = s.type === 'test';
            const weightDisplay = isRest ? 'Rest' : isTest ? 'Test' : `${s.weight} ${currentUnit}`;

            return `
                <div class="day-card ${isActive ? 'active' : ''} ${isRest ? 'rest' : ''} ${isTest ? 'test' : ''}">
                    <div class="day-info">
                        <span class="day-name">${s.dayLabel}</span>
                        <span class="day-scheme ${isRest ? 'rest-text' : ''} ${isTest ? 'test-text' : ''}">${s.scheme}</span>
                    </div>
                    <span class="day-weight ${isRest ? 'rest-text' : ''} ${isTest ? 'test-text' : ''}">${weightDisplay}</span>
                </div>
            `;
        }).join('');
    }

    // --- Full Program View ---
    function renderProgram() {
        const container = document.getElementById('programList');

        const phases = [];
        let currentPhaseName = '';
        let currentPhaseIdx = -1;

        program.forEach(s => {
            if (s.phase !== currentPhaseName || s.phaseIdx !== currentPhaseIdx) {
                currentPhaseName = s.phase;
                currentPhaseIdx = s.phaseIdx;
                phases.push({
                    name: s.phase,
                    idx: s.phaseIdx,
                    weeks: []
                });
            }
            const phase = phases[phases.length - 1];
            let week = phase.weeks.find(w => w.weekNum === s.week);
            if (!week) {
                week = { weekNum: s.week, days: [] };
                phase.weeks.push(week);
            }
            week.days.push(s);
        });

        container.innerHTML = phases.map(phase => {
            const weekRange = phase.weeks.length === 1 ? `Week ${phase.weeks[0].weekNum}` : `Weeks ${phase.weeks[0].weekNum}–${phase.weeks[phase.weeks.length-1].weekNum}`;

            const weeksHtml = phase.weeks.map(wk => {
                const daysHtml = wk.days.map(d => {
                    const isRest = d.type === 'rest';
                    const isTest = d.type === 'test';
                    const weight = isRest ? 'Rest' : isTest ? 'Test' : `${d.weight} ${currentUnit}`;
                    return `
                        <div class="program-day">
                            <div class="program-day-info">
                                <span class="program-day-label">${d.dayLabel}</span>
                                <span class="program-day-scheme ${isRest ? 'rest-text' : ''} ${isTest ? 'test-text' : ''}">${d.scheme}</span>
                            </div>
                            <span class="program-day-weight ${isRest ? 'rest-text' : ''} ${isTest ? 'test-text' : ''}">${weight}</span>
                        </div>
                    `;
                }).join('');

                return `
                    <div class="week-block">
                        <div class="week-label">Week ${wk.weekNum}</div>
                        ${daysHtml}
                    </div>
                `;
            }).join('');

            return `
                <div class="phase-block">
                    <div class="phase-header">
                        <span class="phase-name">${phase.name}</span>
                        <span class="phase-range">${weekRange}</span>
                    </div>
                    ${weeksHtml}
                </div>
            `;
        }).join('');
    }

    // --- Maxes Chart & Logging ---
    async function loadAndRenderMaxes() {
        const chartContainer = document.getElementById('maxesChart');
        if (!chartContainer) return;
        chartContainer.innerHTML = '<p class="maxes-empty">Loading chart…</p>';

        if (typeof LiftMaxesAPI === 'undefined') {
            chartContainer.innerHTML = '<p class="maxes-empty">Lift maxes API not available.</p>';
            return;
        }

        try {
            const records = await LiftMaxesAPI.getAll();
            renderMaxesChart(records);
        } catch (e) {
            console.error('Failed to load maxes:', e);
            chartContainer.innerHTML = '<p class="maxes-empty">Failed to load chart.</p>';
        }
    }

    function renderMaxesChart(records) {
        const container = document.getElementById('maxesChart');
        const legendContainer = document.getElementById('maxesLegend');
        if (!records || records.length === 0) {
            container.innerHTML = '<p class="maxes-empty">No maxes logged yet.</p>';
            if (legendContainer) legendContainer.innerHTML = '';
            return;
        }

        // Group by lift
        const byLift = {};
        records.forEach(r => {
            const name = r.lift_name || 'Unknown';
            if (!byLift[name]) byLift[name] = [];
            byLift[name].push({ date: new Date(r.date_created), weight: r.weight });
        });

        // Sort each group by date
        Object.values(byLift).forEach(arr => arr.sort((a, b) => a.date - b.date));

        // Compute ranges
        let minWeight = Infinity, maxWeight = -Infinity;
        let minDate = Infinity, maxDate = -Infinity;
        Object.values(byLift).forEach(arr => {
            arr.forEach(p => {
                minWeight = Math.min(minWeight, p.weight);
                maxWeight = Math.max(maxWeight, p.weight);
                minDate = Math.min(minDate, p.date);
                maxDate = Math.max(maxDate, p.date);
            });
        });

        const weightRange = maxWeight - minWeight || 1;
        const dateRange = maxDate - minDate || 1;

        // Ensure minimum visual range so labels don't all collapse to the same value
        const uniqueWeights = new Set(records.map(r => r.weight));
        if (uniqueWeights.size === 1) {
            const center = maxWeight;
            minWeight = Math.max(0, center - 25);
            maxWeight = center + 25;
        } else if (weightRange < 10) {
            minWeight = Math.max(0, minWeight - 5);
            maxWeight += 5;
        } else {
            minWeight = Math.max(0, minWeight - weightRange * 0.15);
            maxWeight += weightRange * 0.15;
        }

        const uniqueDatesSet = new Set(records.map(r => new Date(r.date_created).getTime()));
        if (uniqueDatesSet.size === 1) {
            minDate = new Date(minDate.getTime() - 86400000 * 3);
            maxDate = new Date(maxDate.getTime() + 86400000 * 3);
        } else {
            minDate = new Date(minDate.getTime() - 86400000);
            maxDate = new Date(maxDate.getTime() + 86400000);
        }

        const width = 800;
        const height = 360;
        const pad = { top: 30, right: 40, bottom: 55, left: 55 };
        const chartW = width - pad.left - pad.right;
        const chartH = height - pad.top - pad.bottom;

        const scaleX = d => pad.left + ((d - minDate) / (maxDate - minDate)) * chartW;
        const scaleY = w => pad.top + chartH - ((w - minWeight) / (maxWeight - minWeight)) * chartH;

        const colors = {
            'Squat': '#00e676',
            'Bench': '#448aff',
            'Deadlift': '#ff5252',
            'Overhead Press': '#ffd740',
            'Barbell Row': '#ffab40',
            'Front Squat': '#00e5ff'
        };

        let svg = `<svg viewBox="0 0 ${width} ${height}" preserveAspectRatio="xMidYMid meet" style="width:100%;height:auto;">`;

        // Grid lines (horizontal)
        for (let i = 0; i <= 5; i++) {
            const y = pad.top + (chartH / 5) * i;
            const wVal = maxWeight - (maxWeight - minWeight) * (i / 5);
            const wLabel = Math.round(wVal);
            svg += `<line x1="${pad.left}" y1="${y}" x2="${width - pad.right}" y2="${y}" stroke="#2a2e36" stroke-width="1"/>`;
            svg += `<text x="${pad.left - 10}" y="${y + 4}" text-anchor="end" fill="#8b919c" font-size="12" font-family="inherit" font-weight="600">${wLabel}</text>`;
        }

        // Date labels
        const allDates = [];
        Object.values(byLift).forEach(arr => {
            arr.forEach(p => allDates.push(p.date));
        });
        const uniqueDateTimes = [...new Set(allDates.map(d => d.getTime()))].sort((a, b) => a - b);
        const step = Math.max(1, Math.floor(uniqueDateTimes.length / 6));
        for (let i = 0; i < uniqueDateTimes.length; i += step) {
            const d = new Date(uniqueDateTimes[i]);
            const x = scaleX(d);
            const label = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            svg += `<text x="${x}" y="${height - pad.bottom + 20}" text-anchor="middle" fill="#8b919c" font-size="12" font-family="inherit" font-weight="600">${label}</text>`;
        }
        // Bottom axis line
        svg += `<line x1="${pad.left}" y1="${height - pad.bottom}" x2="${width - pad.right}" y2="${height - pad.bottom}" stroke="#2a2e36" stroke-width="1"/>`;
        // Left axis line
        svg += `<line x1="${pad.left}" y1="${pad.top}" x2="${pad.left}" y2="${height - pad.bottom}" stroke="#2a2e36" stroke-width="1"/>`;

        // Lines, area fill, dots, and weight labels
        Object.entries(byLift).forEach(([lift, points]) => {
            const color = colors[lift] || '#e040fb';
            const lineD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.date)} ${scaleY(p.weight)}`).join(' ');

            // Area fill under line
            const areaD = lineD + ` L ${scaleX(points[points.length - 1].date)} ${height - pad.bottom} L ${scaleX(points[0].date)} ${height - pad.bottom} Z`;
            svg += `<path d="${areaD}" fill="${color}" opacity="0.06"/>`;

            // Line
            svg += `<path d="${lineD}" fill="none" stroke="${color}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>`;

            // Dots and weight labels
            points.forEach(p => {
                const cx = scaleX(p.date);
                const cy = scaleY(p.weight);
                svg += `<circle cx="${cx}" cy="${cy}" r="5" fill="${color}" stroke="#14161b" stroke-width="2.5"/>`;
                svg += `<text x="${cx}" y="${cy - 12}" text-anchor="middle" fill="${color}" font-size="12" font-family="inherit" font-weight="700">${p.weight}</text>`;
            });
        });

        svg += '</svg>';
        container.innerHTML = svg;

        // Legend
        if (legendContainer) {
            legendContainer.innerHTML = Object.keys(byLift).map(lift => {
                const color = colors[lift] || '#e040fb';
                return `<span class="legend-item"><span class="legend-dot" style="background:${color}"></span>${lift}</span>`;
            }).join('');
        }
    }

    async function logMaxFromForm() {
        const liftSelect = document.getElementById('maxesLiftSelect');
        const weightInput = document.getElementById('maxesWeightInput');
        const lift = liftSelect?.value;
        const val = parseFloat(weightInput?.value);
        if (!lift || !val || val <= 0) return;

        if (typeof LiftMaxesAPI !== 'undefined') {
            try {
                await LiftMaxesAPI.create({ lift_name: lift, weight: val });
                weightInput.value = '';
                showDbStatus('Max logged');
                loadAndRenderMaxes();
            } catch (e) {
                console.error('Failed to log max:', e);
                showDbStatus('Failed to log max');
            }
        }
    }

    async function logPostProgramMax() {
        const input = document.getElementById('testDayMaxInput');
        const val = parseFloat(input?.value);
        if (!val || val <= 0) return;

        if (typeof LiftMaxesAPI !== 'undefined') {
            try {
                await LiftMaxesAPI.create({ lift_name: selectedLift, weight: val });
                input.value = '';
                showDbStatus('Max logged');
                const maxesTab = document.getElementById('maxesTab');
                if (maxesTab?.classList.contains('active')) {
                    loadAndRenderMaxes();
                }
            } catch (e) {
                console.error('Failed to log max:', e);
                showDbStatus('Failed to log max');
            }
        }
    }

    async function restartProgramWithMax(weight, liftName) {
        rawMax = weight;
        selectedLift = liftName;
        workingMax = trainingMaxCb.checked ? Math.round(weight * 0.9) : weight;

        program = buildProgram(workingMax, currentUnit, weeklyIncrement);
        currentDayIndex = 0;
        completedDays = 0;
        streak = 0;
        lastCompleted = null;

        const existing = liftPlans[selectedLift];
        if (existing) {
            planId = existing.id;
        } else {
            planId = null;
        }

        renderAll();
        renderLiftTabs();
        await savePlanToDirectus();

        // Switch to Today tab
        tabBtns.forEach(b => b.classList.remove('active'));
        tabPanels.forEach(p => p.classList.remove('active'));
        document.querySelector('[data-tab="today"]')?.classList.add('active');
        document.getElementById('todayTab')?.classList.add('active');

        showDbStatus('Program restarted with new max');
    }

    async function logAndRestartFromTestDay() {
        const input = document.getElementById('testDayMaxInput');
        const val = parseFloat(input?.value);
        if (!val || val <= 0) return;

        if (typeof LiftMaxesAPI !== 'undefined') {
            try {
                await LiftMaxesAPI.create({ lift_name: selectedLift, weight: val });
            } catch (e) {
                console.error('Failed to log max:', e);
            }
        }

        await restartProgramWithMax(val, selectedLift);
        input.value = '';
        document.getElementById('testDayCard')?.classList.add('hidden');
    }

    async function logAndRestartFromForm() {
        const liftSelect = document.getElementById('maxesLiftSelect');
        const weightInput = document.getElementById('maxesWeightInput');
        const lift = liftSelect?.value;
        const val = parseFloat(weightInput?.value);
        if (!lift || !val || val <= 0) return;

        if (typeof LiftMaxesAPI !== 'undefined') {
            try {
                await LiftMaxesAPI.create({ lift_name: lift, weight: val });
            } catch (e) {
                console.error('Failed to log max:', e);
            }
        }

        await restartProgramWithMax(val, lift);
        weightInput.value = '';
        loadAndRenderMaxes();
    }

    // Add shake animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes shake {
            0%, 100% { transform: translateX(0); }
            25% { transform: translateX(-8px); }
            75% { transform: translateX(8px); }
        }
    `;
    document.head.appendChild(style);

    // --- Up Next card: tap to complete (with undo) ---
    const upNextCardEl = document.getElementById('upNextCard');
    if (upNextCardEl) {
        upNextCardEl.addEventListener('click', () => {
            if (upNextCardEl.getAttribute('aria-disabled') === 'true') return;
            handleUpNextTap();
        });
        upNextCardEl.addEventListener('keydown', (e) => {
            if (upNextCardEl.getAttribute('aria-disabled') === 'true') return;
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleUpNextTap();
            }
        });
    }

    // --- Maxes tab form ---
    document.getElementById('maxesLogBtn')?.addEventListener('click', () => {
        logMaxFromForm();
    });

    document.getElementById('maxesRestartBtn')?.addEventListener('click', () => {
        logAndRestartFromForm();
    });

    document.getElementById('maxesWeightInput')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') logMaxFromForm();
    });

    // --- Test day max logger ---
    document.getElementById('testDayLogBtn')?.addEventListener('click', () => {
        logPostProgramMax();
    });

    document.getElementById('testDayRestartBtn')?.addEventListener('click', () => {
        logAndRestartFromTestDay();
    });

    document.getElementById('testDayMaxInput')?.addEventListener('keydown', e => {
        if (e.key === 'Enter') logPostProgramMax();
    });

    // --- Cancel setup ---
    document.getElementById('cancelSetupBtn')?.addEventListener('click', () => {
        hideAddLift();
    });

    // --- Init: Try load from Directus ---
    loadPlanFromDirectus();

})();
