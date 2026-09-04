(() => {
  "use strict";

  const canvas = document.getElementById("gameCanvas");
  const ctx = canvas.getContext("2d");
  ctx.imageSmoothingEnabled = false;

  const TILE = 16;
  const COLS = canvas.width / TILE;
  const ROWS = canvas.height / TILE;
  const DAY_LENGTH = 90;
  const NIGHT_LENGTH = 40;

  const BUILDING_TYPES = {
    hut: {
      label: "Timber Hut",
      cells: [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [0, 2], [1, 2]],
      wood: 30, stone: 0, buildTime: 16, maxHealth: 180,
    },
    farm: {
      label: "Root Farm",
      cells: [[0, 0], [1, 0], [2, 0], [3, 0], [0, 1], [1, 1], [2, 1], [3, 1], [0, 2], [1, 2], [0, 3], [1, 3]],
      wood: 25, stone: 0, buildTime: 12, maxHealth: 120,
    },
    wall: { label: "Stone Wall", cells: [[0, 0], [1, 0]], wood: 0, stone: 8, buildTime: 5, maxHealth: 240 },
    tower: { label: "Arrow Tower", cells: [[0, 0], [1, 0], [0, 1], [1, 1]], wood: 25, stone: 20, buildTime: 19, maxHealth: 190 },
    storehouse: {
      label: "Storehouse",
      cells: [[0, 0], [1, 0], [2, 0], [0, 1], [1, 1], [2, 1], [1, 2]],
      wood: 35, stone: 15, buildTime: 18, maxHealth: 210,
    },
  };

  const TOOL_HELP = {
    inspect: "Inspect settlers and structures",
    harvest: "Harvest brush · mark nearby resources",
    hut: "Timber Hut · L-shaped · +4 housing",
    farm: "Root Farm · river-fed bonus · R rotates",
    wall: "Stone Wall · 2-cell segment · R rotates",
    tower: "Arrow Tower · wall adjacency boosts range",
    storehouse: "Storehouse · +100 storage · T-shaped",
    ward: "Ward · slow enemies or cleanse a shrine",
    flare: "Sunflare · damage enemies in an area",
  };

  const FIRST_NAMES = ["Mara", "Oren", "Sable", "Toma", "Ilya", "Fen", "Nia", "Bram", "Edda", "Corin", "Lark", "Veya", "Hollis", "Ansel"];
  const LAST_NAMES = ["Thorn", "Vale", "Moss", "Ember", "Rook", "Pine", "Ash", "Reed", "Wren", "Hearth"];
  const SHIRT_COLORS = ["#c88d52", "#79a9a1", "#ba735f", "#9f9ac0", "#91ad68", "#d1b06d"];

  const ui = {
    startScreen: document.getElementById("startScreen"),
    newGameButton: document.getElementById("newGameButton"),
    howToPlayButton: document.getElementById("howToPlayButton"),
    howToPanel: document.getElementById("howToPanel"),
    closeHowTo: document.getElementById("closeHowTo"),
    pauseButton: document.getElementById("pauseButton"),
    speedButtons: [...document.querySelectorAll(".speed-button")],
    toolButtons: [...document.querySelectorAll(".tool-button")],
    cursorLabel: document.getElementById("cursorLabel"),
    food: document.getElementById("foodValue"),
    wood: document.getElementById("woodValue"),
    stone: document.getElementById("stoneValue"),
    water: document.getElementById("waterValue"),
    spirit: document.getElementById("spiritValue"),
    population: document.getElementById("populationValue"),
    capacity: document.getElementById("capacityValue"),
    phaseLabel: document.getElementById("phaseLabel"),
    cycleTimer: document.getElementById("cycleTimer"),
    cycleProgress: document.getElementById("cycleProgress"),
    cycleTrack: document.querySelector(".cycle-track"),
    phaseHint: document.getElementById("phaseHint"),
    threatValue: document.getElementById("threatValue"),
    threatPips: [...document.querySelectorAll("#threatPips i")],
    nightObjective: document.getElementById("nightObjective"),
    shrineObjective: document.getElementById("shrineObjective"),
    heartHealthValue: document.getElementById("heartHealthValue"),
    heartHealthBar: document.getElementById("heartHealthBar"),
    selectionTitle: document.getElementById("selectionTitle"),
    settlerName: document.getElementById("settlerName"),
    settlerJob: document.getElementById("settlerJob"),
    settlerMood: document.getElementById("settlerMood"),
    needMeters: document.getElementById("needMeters"),
    hungerBar: document.getElementById("hungerBar"),
    thirstBar: document.getElementById("thirstBar"),
    housingStat: document.getElementById("housingStat"),
    foodDaysStat: document.getElementById("foodDaysStat"),
    defenseStat: document.getElementById("defenseStat"),
    killsStat: document.getElementById("killsStat"),
    eventLog: document.getElementById("eventLog"),
    clearLogButton: document.getElementById("clearLogButton"),
    rotateButton: document.getElementById("rotateButton"),
    jobButtons: [...document.querySelectorAll("[data-job][data-delta]")],
    buildersCount: document.getElementById("buildersCount"),
    gatherersCount: document.getElementById("gatherersCount"),
    farmersCount: document.getElementById("farmersCount"),
    idleWorkers: document.getElementById("idleWorkers"),
    storageValue: document.getElementById("storageValue"),
    toastStack: document.getElementById("toastStack"),
  };

  let game;
  let selectedTool = "inspect";
  let buildingRotation = 0;
  let hoveredTile = null;
  let lastFrame = performance.now();
  let nextId = 1;

  function hash(x, y, seed = 1) {
    let value = Math.imul(x + seed * 17, 374761393) + Math.imul(y + seed * 23, 668265263);
    value = (value ^ (value >>> 13)) * 1274126177;
    return ((value ^ (value >>> 16)) >>> 0) / 4294967295;
  }

  function distance(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  function heartCenter() {
    return { x: game.heart.x + game.heart.width / 2, y: game.heart.y + game.heart.height / 2 };
  }

  function footprintFor(type, rotation = 0) {
    const config = BUILDING_TYPES[type];
    if (!config) return [];
    let cells = config.cells.map(([x, y]) => ({ x, y }));
    for (let turn = 0; turn < rotation % 4; turn += 1) cells = cells.map((cell) => ({ x: -cell.y, y: cell.x }));
    const minX = Math.min(...cells.map((cell) => cell.x));
    const minY = Math.min(...cells.map((cell) => cell.y));
    return cells.map((cell) => ({ x: cell.x - minX, y: cell.y - minY }));
  }

  function footprintBounds(cells) {
    return {
      width: Math.max(...cells.map((cell) => cell.x)) + 1,
      height: Math.max(...cells.map((cell) => cell.y)) + 1,
    };
  }

  function cellsForBuilding(building) {
    if (building.type === "heart") {
      return Array.from({ length: building.width * building.height }, (_, index) => ({
        x: building.x + (index % building.width),
        y: building.y + Math.floor(index / building.width),
      }));
    }
    return footprintFor(building.type, building.rotation).map((cell) => ({ x: building.x + cell.x, y: building.y + cell.y }));
  }

  function tileAt(x, y) {
    if (x < 0 || y < 0 || x >= COLS || y >= ROWS) return null;
    return game.tiles[y][x];
  }

  function createWorld(seed) {
    const tiles = [];
    const centerX = Math.floor(COLS / 2);
    const centerY = Math.floor(ROWS / 2);
    for (let y = 0; y < ROWS; y += 1) {
      const row = [];
      const riverCenter = 8 + Math.round(Math.sin(y * 0.24 + seed) * 2.1 + Math.sin(y * 0.61) * 0.7);
      for (let x = 0; x < COLS; x += 1) {
        const isRiver = Math.abs(x - riverCenter) <= (y % 9 < 3 ? 1 : 0);
        const clearing = Math.hypot(x - centerX, y - centerY) < 8;
        const path = !isRiver && ((Math.abs(y - centerY) < 1 && x > riverCenter + 2) || (Math.abs(x - centerX) < 1 && y > 5));
        const wild = hash(Math.floor(x / 4), Math.floor(y / 4), seed + 91);
        const type = isRiver ? "water" : path ? "path" : clearing ? "meadow" : wild > 0.68 ? "moor" : "grass";
        row.push({ type, variation: Math.floor(hash(x, y, seed) * 4), riverCenter });
      }
      tiles.push(row);
    }

    const shrines = [
      { id: nextId++, x: 14, y: 8, cleansed: false },
      { id: nextId++, x: COLS - 10, y: 9, cleansed: false },
      { id: nextId++, x: COLS - 12, y: ROWS - 8, cleansed: false },
    ];

    const nodes = [];
    for (let y = 2; y < ROWS - 2; y += 1) {
      for (let x = 2; x < COLS - 2; x += 1) {
        const centerDistance = Math.hypot(x - centerX, y - centerY);
        const nearShrine = shrines.some((shrine) => Math.hypot(x - shrine.x, y - shrine.y) < 2.5);
        const roll = hash(x, y, seed + 12);
        if (tiles[y][x].type === "water" || tiles[y][x].type === "path" || centerDistance < 7 || nearShrine || roll > 0.105) continue;
        const typeRoll = hash(x, y, seed + 44);
        const type = typeRoll < 0.56 ? "tree" : typeRoll < 0.79 ? "rock" : "berry";
        nodes.push({
          id: nextId++,
          x,
          y,
          type,
          amount: type === "tree" ? 30 : type === "rock" ? 24 : 20,
          marked: centerDistance < 9,
        });
      }
    }

    return { tiles, nodes, shrines };
  }

  function createSettler(index, x, y) {
    const nameIndex = (index * 3 + game.seed) % FIRST_NAMES.length;
    const lastIndex = (index * 5 + game.seed) % LAST_NAMES.length;
    return {
      id: nextId++,
      name: `${FIRST_NAMES[nameIndex]} ${LAST_NAMES[lastIndex]}`,
      x,
      y,
      health: 100,
      maxHealth: 100,
      task: null,
      carrying: null,
      carryAmount: 0,
      workTimer: 0,
      speed: 1.62 + (index % 3) * 0.1,
      shirt: SHIRT_COLORS[index % SHIRT_COLORS.length],
      trait: ["Steady", "Bright", "Stubborn", "Kind", "Watchful"][index % 5],
      role: "idle",
      hunger: 78 + (index % 4) * 5,
      thirst: 72 + (index % 3) * 7,
    };
  }

  function makeGame() {
    const seed = 37;
    const world = createWorld(seed);
    const centerX = Math.floor(COLS / 2);
    const centerY = Math.floor(ROWS / 2);
    const heart = { id: nextId++, type: "heart", x: centerX - 1, y: centerY - 1, width: 3, height: 3, health: 500, maxHealth: 500, built: true };
    const state = {
      seed,
      started: false,
      ended: false,
      paused: false,
      speed: 1,
      phase: "day",
      phaseTime: 0,
      day: 1,
      nightsSurvived: 0,
      resources: { food: 55, wood: 70, stone: 28, water: 60, spirit: 60 },
      workforce: { builders: 3, gatherers: 4, farmers: 1 },
      tiles: world.tiles,
      nodes: world.nodes,
      shrines: world.shrines,
      heart,
      buildings: [heart],
      settlers: [],
      enemies: [],
      projectiles: [],
      effects: [],
      wards: [],
      kills: 0,
      spawnRemaining: 0,
      spawnTimer: 0,
      recruitmentTimer: 0,
      starvationTimer: 0,
      selectedEntity: null,
    };

    game = state;
    for (let index = 0; index < 8; index += 1) {
      const angle = (Math.PI * 2 * index) / 8;
      state.settlers.push(createSettler(index, centerX + 0.5 + Math.cos(angle) * 4.2, centerY + 0.5 + Math.sin(angle) * 3.5));
    }
    state.selectedEntity = state.settlers[0];
    updateRoles();
    return state;
  }

  function capacity() {
    return 10 + game.buildings.filter((building) => building.type === "hut" && building.built).length * 4;
  }

  function storageCapacity() {
    return 120 + game.buildings.filter((building) => building.type === "storehouse" && building.built && building.health > 0).length * 100;
  }

  function addLog(message, label) {
    const paragraph = document.createElement("p");
    const time = document.createElement("time");
    time.textContent = label || `${game.phase === "day" ? "DAY" : "NIGHT"} ${game.day}`;
    paragraph.append(time, document.createTextNode(message));
    ui.eventLog.prepend(paragraph);
    while (ui.eventLog.children.length > 8) ui.eventLog.lastElementChild.remove();
  }

  function toast(message, tone = "normal") {
    const item = document.createElement("div");
    item.className = `toast${tone === "danger" ? " toast--danger" : ""}`;
    item.textContent = message;
    ui.toastStack.appendChild(item);
    window.setTimeout(() => item.remove(), 3200);
  }

  function setTool(tool) {
    selectedTool = tool;
    if (BUILDING_TYPES[tool]) buildingRotation = 0;
    ui.toolButtons.forEach((button) => {
      const selected = button.dataset.tool === tool;
      button.classList.toggle("is-selected", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
    ui.cursorLabel.textContent = TOOL_HELP[tool];
    if (ui.rotateButton) ui.rotateButton.disabled = !BUILDING_TYPES[tool];
  }

  function rotateBuilding() {
    if (!BUILDING_TYPES[selectedTool]) return;
    buildingRotation = (buildingRotation + 1) % 4;
    ui.cursorLabel.textContent = `${TOOL_HELP[selectedTool]} · ${buildingRotation * 90}°`;
    toast(`${BUILDING_TYPES[selectedTool].label} rotated`);
  }

  function setPaused(paused) {
    if (!game.started || game.ended) return;
    game.paused = paused;
    ui.pauseButton.textContent = paused ? "▶" : "Ⅱ";
    ui.pauseButton.setAttribute("aria-label", paused ? "Resume" : "Pause");
    if (paused) toast("The valley waits.");
  }

  function setSpeed(speed) {
    game.speed = speed;
    ui.speedButtons.forEach((button) => {
      const selected = Number(button.dataset.speed) === speed;
      button.classList.toggle("is-active", selected);
      button.setAttribute("aria-pressed", String(selected));
    });
  }

  function startExpedition() {
    makeGame();
    game.started = true;
    ui.startScreen.hidden = true;
    ui.howToPanel.hidden = true;
    ui.eventLog.replaceChildren();
    addLog("The Heartfire answers. Eight settlers enter the valley.", "DAWN");
    toast("Assign workers, mark resources, and watch every delivery.");
    setTool("inspect");
    setSpeed(1);
    updateUI();
  }

  function endExpedition(won) {
    if (game.ended) return;
    game.ended = true;
    game.paused = true;
    const eyebrow = ui.startScreen.querySelector(".start-eyebrow");
    const title = ui.startScreen.querySelector("h1");
    const description = ui.startScreen.querySelector(".start-content > p:nth-of-type(2)");
    eyebrow.textContent = won ? "THE VALLEY ENDURES" : "THE HEARTFIRE FADES";
    title.textContent = won ? "DAWN HOLDS" : "EMBERWARD";
    description.textContent = won
      ? `Six nights survived, ${game.kills} blight creatures defeated, and every shrine restored. This settlement has a future.`
      : `The blight reached the Heartfire on night ${game.day}. Build tighter, gather earlier, and save Spirit for the breach.`;
    ui.newGameButton.textContent = "BEGIN AGAIN";
    ui.startScreen.hidden = false;
  }

  function resetStartCopy() {
    ui.startScreen.querySelector(".start-eyebrow").textContent = "A COLONY SURVIVAL GAME";
    ui.startScreen.querySelector("h1").textContent = "EMBERWARD";
    ui.startScreen.querySelector(".start-content > p:nth-of-type(2)").textContent = "Raise a settlement in the last warm valley. Build by daylight. Stand with your people when the blight arrives.";
    ui.newGameButton.textContent = "BEGIN EXPEDITION";
  }

  function moveToward(entity, target, speed, dt) {
    const dx = target.x - entity.x;
    const dy = target.y - entity.y;
    const length = Math.hypot(dx, dy);
    if (length < 0.04) return true;
    const step = Math.min(length, speed * dt);
    entity.x += (dx / length) * step;
    entity.y += (dy / length) * step;
    return length <= step + 0.05;
  }

  function nearest(items, from, predicate = () => true) {
    let best = null;
    let bestDistance = Infinity;
    items.forEach((item) => {
      if (!predicate(item)) return;
      const value = distance(item, from);
      if (value < bestDistance) {
        bestDistance = value;
        best = item;
      }
    });
    return best;
  }

  function chooseResource(settler) {
    if (game.resources.food < 45) return "berry";
    if (game.resources.wood < 55) return "tree";
    if (game.resources.stone < 25) return "rock";
    return ["tree", "berry", "tree", "rock"][settler.id % 4];
  }

  function updateRoles() {
    const roles = ["builders", "gatherers", "farmers"];
    let cursor = 0;
    roles.forEach((role) => {
      const singular = role.slice(0, -1);
      for (let count = 0; count < game.workforce[role] && cursor < game.settlers.length; count += 1) {
        game.settlers[cursor].role = singular;
        cursor += 1;
      }
    });
    while (cursor < game.settlers.length) {
      game.settlers[cursor].role = "idle";
      cursor += 1;
    }
  }

  function normalizeWorkforce() {
    let excess = Object.values(game.workforce).reduce((total, value) => total + value, 0) - game.settlers.length;
    for (const role of ["gatherers", "builders", "farmers"]) {
      if (excess <= 0) break;
      const removed = Math.min(excess, game.workforce[role]);
      game.workforce[role] -= removed;
      excess -= removed;
    }
    updateRoles();
  }

  function cancelTask(settler, returnCargo = true) {
    if (settler.task?.kind === "supply" && settler.task.target?.incoming) {
      const resource = settler.task.resource;
      settler.task.target.incoming[resource] = Math.max(0, settler.task.target.incoming[resource] - settler.task.amount);
    }
    if (returnCargo && settler.carrying && settler.carryAmount > 0) {
      game.resources[settler.carrying] = Math.min(storageCapacity(), game.resources[settler.carrying] + settler.carryAmount);
    }
    settler.carrying = null;
    settler.carryAmount = 0;
    settler.task = null;
    settler.workTimer = 0;
  }

  function changeWorkforce(job, delta) {
    if (!game.workforce[job]) game.workforce[job] = 0;
    const assigned = Object.values(game.workforce).reduce((total, value) => total + value, 0);
    if (delta > 0 && assigned >= game.settlers.length) {
      toast("No idle settlers are available.");
      return;
    }
    game.workforce[job] = Math.max(0, game.workforce[job] + delta);
    game.settlers.forEach((settler) => cancelTask(settler));
    updateRoles();
  }

  function nearestWater(settler) {
    let result = null;
    let best = Infinity;
    for (let y = 1; y < ROWS - 1; y += 1) {
      for (let x = 1; x < COLS - 1; x += 1) {
        if (tileAt(x, y)?.type !== "water") continue;
        const value = Math.hypot(settler.x - (x + 0.5), settler.y - (y + 0.5));
        if (value < best) {
          best = value;
          result = { x: x + 0.5, y: y + 0.5 };
        }
      }
    }
    return result;
  }

  function materialsReady(building) {
    const config = BUILDING_TYPES[building.type];
    return building.delivered.wood >= config.wood && building.delivered.stone >= config.stone;
  }

  function assignConstructionTask(settler) {
    const construction = nearest(game.buildings, settler, (building) => !building.built && building.health > 0);
    if (!construction) return false;
    const config = BUILDING_TYPES[construction.type];
    for (const resource of ["wood", "stone"]) {
      const missing = config[resource] - construction.delivered[resource] - construction.incoming[resource];
      if (missing <= 0) continue;
      const available = Math.floor(game.resources[resource]);
      if (available > 0) {
        const amount = Math.min(6, missing, available);
        construction.incoming[resource] += amount;
        settler.task = { kind: "supply", target: construction, resource, amount, stage: "pickup" };
        return true;
      }
      const nodeType = resource === "wood" ? "tree" : "rock";
      const node = nearest(game.nodes, settler, (item) => item.amount > 0 && item.type === nodeType);
      if (node) {
        settler.task = { kind: "harvest", target: node, stage: "out", forConstruction: true };
        return true;
      }
    }
    if (materialsReady(construction)) {
      settler.task = { kind: "build", target: construction };
      return true;
    }
    return false;
  }

  function assignSettlerTask(settler) {
    if (game.phase === "night") {
      const center = heartCenter();
      const angle = (settler.id % 8) * (Math.PI / 4);
      settler.task = { kind: "shelter", target: { x: center.x + Math.cos(angle) * 2.2, y: center.y + Math.sin(angle) * 1.7 } };
      return;
    }

    const center = heartCenter();
    if (settler.thirst < 42 && game.resources.water >= 1) {
      settler.task = { kind: "drink", target: center };
      return;
    }
    if (settler.hunger < 38 && game.resources.food >= 1) {
      settler.task = { kind: "eat", target: center };
      return;
    }

    if (settler.role === "builder") {
      if (assignConstructionTask(settler)) return;
      const damaged = nearest(game.buildings, settler, (building) => building.built && building.health > 0 && building.health < building.maxHealth - 1);
      if (damaged) {
        settler.task = { kind: "repair", target: damaged };
        return;
      }
    } else if (settler.role === "gatherer") {
      if (game.resources.water < 38) {
        const water = nearestWater(settler);
        if (water) {
          settler.task = { kind: "water", target: water, stage: "out" };
          return;
        }
      }
      const preferredType = chooseResource(settler);
      let node = nearest(game.nodes, settler, (item) => item.marked && item.amount > 0 && item.type === preferredType);
      if (!node) node = nearest(game.nodes, settler, (item) => item.marked && item.amount > 0);
      if (node) {
        settler.task = { kind: "harvest", target: node, stage: "out" };
        return;
      }
    } else if (settler.role === "farmer") {
      const farm = nearest(game.buildings, settler, (building) => building.type === "farm" && building.built && building.health > 0);
      if (farm) {
        settler.task = { kind: "farm", target: farm, stage: "out" };
        return;
      }
    }

    const angle = hash(settler.id, Math.floor(game.phaseTime), game.seed) * Math.PI * 2;
    const radius = 2 + hash(settler.id, 19, game.seed) * 3.5;
    settler.task = { kind: "wander", target: { x: center.x + Math.cos(angle) * radius, y: center.y + Math.sin(angle) * radius } };
  }

  function updateSettlers(dt) {
    const center = heartCenter();
    updateRoles();

    game.settlers.forEach((settler) => {
      settler.hunger = Math.max(0, settler.hunger - dt * 0.34);
      settler.thirst = Math.max(0, settler.thirst - dt * 0.52);
      if (settler.hunger <= 0 || settler.thirst <= 0) settler.health -= dt * 1.8;
      if (!settler.task) assignSettlerTask(settler);
      const task = settler.task;
      if (!task) return;

      if (task.kind === "build") {
        if (!task.target || task.target.health <= 0 || task.target.built || !materialsReady(task.target)) {
          settler.task = null;
          return;
        }
        const destination = { x: task.target.x + task.target.width / 2, y: task.target.y + task.target.height / 2 };
        if (moveToward(settler, destination, settler.speed, dt)) {
          task.target.progress += dt;
          task.target.health = Math.max(1, task.target.maxHealth * Math.min(1, task.target.progress / task.target.buildTime));
          if (task.target.progress >= task.target.buildTime) {
            task.target.built = true;
            task.target.health = task.target.maxHealth;
            if (!task.target.notified) {
              task.target.notified = true;
              addLog(`${settler.name} completed a ${BUILDING_TYPES[task.target.type].label}.`);
              toast(`${BUILDING_TYPES[task.target.type].label} completed`);
            }
            settler.task = null;
          }
        }
        return;
      }

      if (task.kind === "supply") {
        const building = task.target;
        if (!building || building.health <= 0 || building.built) {
          cancelTask(settler);
          return;
        }
        if (task.stage === "pickup") {
          if (moveToward(settler, center, settler.speed, dt)) {
            if (game.resources[task.resource] < task.amount) {
              cancelTask(settler, false);
              return;
            }
            game.resources[task.resource] -= task.amount;
            settler.carrying = task.resource;
            settler.carryAmount = task.amount;
            task.stage = "deliver";
          }
        } else {
          const destination = { x: building.x + building.width / 2, y: building.y + building.height / 2 };
          if (moveToward(settler, destination, settler.speed, dt)) {
            building.delivered[task.resource] += task.amount;
            building.incoming[task.resource] = Math.max(0, building.incoming[task.resource] - task.amount);
            settler.carrying = null;
            settler.carryAmount = 0;
            settler.task = null;
          }
        }
        return;
      }

      if (task.kind === "repair") {
        if (!task.target || task.target.health <= 0 || task.target.health >= task.target.maxHealth) {
          settler.task = null;
          return;
        }
        const destination = { x: task.target.x + task.target.width / 2, y: task.target.y + task.target.height / 2 };
        if (moveToward(settler, destination, settler.speed, dt)) {
          task.target.health = Math.min(task.target.maxHealth, task.target.health + dt * 10);
          if (task.target.health >= task.target.maxHealth) settler.task = null;
        }
        return;
      }

      if (task.kind === "harvest") {
        const node = task.target;
        if (!node || node.amount <= 0) {
          settler.task = null;
          return;
        }
        if (task.stage === "out") {
          if (moveToward(settler, node, settler.speed, dt)) {
            task.stage = "work";
            settler.workTimer = 0;
          }
        } else if (task.stage === "work") {
          settler.workTimer += dt;
          if (settler.workTimer >= 1.8) {
            const amount = Math.min(6, node.amount);
            node.amount -= amount;
            settler.carrying = node.type === "tree" ? "wood" : node.type === "rock" ? "stone" : "food";
            settler.carryAmount = amount;
            task.stage = "return";
          }
        } else if (moveToward(settler, center, settler.speed, dt)) {
          game.resources[settler.carrying] = Math.min(storageCapacity(), game.resources[settler.carrying] + settler.carryAmount);
          settler.carrying = null;
          settler.carryAmount = 0;
          settler.task = null;
        }
        return;
      }

      if (task.kind === "water") {
        if (task.stage === "out") {
          if (moveToward(settler, task.target, settler.speed, dt)) {
            settler.workTimer = 0;
            task.stage = "work";
          }
        } else if (task.stage === "work") {
          settler.workTimer += dt;
          if (settler.workTimer >= 1.2) {
            settler.carrying = "water";
            settler.carryAmount = 8;
            task.stage = "return";
          }
        } else if (moveToward(settler, center, settler.speed, dt)) {
          game.resources.water = Math.min(storageCapacity(), game.resources.water + settler.carryAmount);
          settler.carrying = null;
          settler.carryAmount = 0;
          settler.task = null;
        }
        return;
      }

      if (task.kind === "farm") {
        const farm = task.target;
        if (!farm || !farm.built || farm.health <= 0) {
          settler.task = null;
          return;
        }
        const destination = { x: farm.x + farm.width / 2, y: farm.y + farm.height / 2 };
        if (task.stage === "out") {
          if (moveToward(settler, destination, settler.speed, dt)) {
            settler.workTimer = 0;
            task.stage = "work";
          }
        } else if (task.stage === "work") {
          settler.workTimer += dt;
          if (settler.workTimer >= 4.5) {
            settler.carrying = "food";
            settler.carryAmount = Math.round(5 * farmMultiplier(farm));
            task.stage = "return";
          }
        } else if (moveToward(settler, center, settler.speed, dt)) {
          game.resources.food = Math.min(storageCapacity(), game.resources.food + settler.carryAmount);
          settler.carrying = null;
          settler.carryAmount = 0;
          settler.task = null;
        }
        return;
      }

      if (task.kind === "eat" || task.kind === "drink") {
        if (moveToward(settler, center, settler.speed, dt)) {
          const resource = task.kind === "eat" ? "food" : "water";
          if (game.resources[resource] >= 1) {
            game.resources[resource] -= 1;
            if (task.kind === "eat") settler.hunger = Math.min(100, settler.hunger + 62);
            else settler.thirst = Math.min(100, settler.thirst + 70);
          }
          settler.task = null;
        }
        return;
      }

      if (task.kind === "shelter" || task.kind === "wander") {
        if (moveToward(settler, task.target, settler.speed * 0.72, dt)) settler.task = null;
      }
    });
  }

  function updateEconomy(dt) {
    if (game.phase === "day") game.resources.spirit = Math.min(100, game.resources.spirit + 0.12 * dt + game.settlers.length * 0.006 * dt);

    if (game.resources.food <= 0 || game.resources.water <= 0) {
      game.starvationTimer += dt;
      if (game.starvationTimer > 12) {
        game.starvationTimer = 0;
        addLog(game.resources.water <= 0 ? "The water jars are empty. Gatherers must refill them at the river." : "The food stores are empty. Settlers will weaken as hunger takes hold.", "WARNING");
      }
    } else {
      game.starvationTimer = 0;
    }

    if (game.phase === "day" && game.settlers.length < capacity() && game.resources.food >= 30) {
      game.recruitmentTimer += dt;
      if (game.recruitmentTimer >= 28) {
        game.recruitmentTimer = 0;
        game.resources.food -= 15;
        const center = heartCenter();
        const settler = createSettler(game.settlers.length, center.x + 2.3, center.y);
        game.settlers.push(settler);
        addLog(`${settler.name}, a ${settler.trait.toLowerCase()} wanderer, joined the settlement.`);
        toast("A new settler arrived");
      }
    } else {
      game.recruitmentTimer = 0;
    }

    const dead = game.settlers.filter((settler) => settler.health <= 0);
    dead.forEach((settler) => addLog(`${settler.name} was lost to the blight.`, "LOSS"));
    game.settlers = game.settlers.filter((settler) => settler.health > 0);
    normalizeWorkforce();
    if (game.settlers.length === 0) endExpedition(false);
  }

  function beginNight() {
    game.phase = "night";
    game.phaseTime = 0;
    game.spawnRemaining = 4 + game.day * 2;
    game.spawnTimer = 1.5;
    game.settlers.forEach((settler) => cancelTask(settler));
    addLog(`Night ${game.day} falls. ${game.spawnRemaining} shapes move beyond the firelight.`, `NIGHT ${game.day}`);
    toast(`Night ${game.day}: the blight is coming`, "danger");
  }

  function beginDay() {
    game.nightsSurvived += 1;
    game.day += 1;
    game.phase = "day";
    game.phaseTime = 0;
    game.resources.spirit = Math.min(100, game.resources.spirit + 16);
    game.settlers.forEach((settler) => {
      cancelTask(settler);
      settler.health = Math.min(settler.maxHealth, settler.health + 12);
    });
    addLog("Dawn breaks. The survivors repair, gather, and remember.", `DAWN ${game.day}`);
    toast("Dawn breaks · Spirit restored");
    if (game.nightsSurvived >= 6 && game.shrines.every((shrine) => shrine.cleansed)) endExpedition(true);
  }

  function updateCycle(dt) {
    game.phaseTime += dt;
    const duration = game.phase === "day" ? DAY_LENGTH : NIGHT_LENGTH;
    if (game.phaseTime >= duration) {
      if (game.phase === "day") beginNight();
      else beginDay();
    }
  }

  function spawnEnemy() {
    const edge = Math.floor(hash(game.spawnRemaining, game.day, game.seed + Math.floor(game.phaseTime)) * 4);
    let x;
    let y;
    if (edge === 0) { x = 1 + hash(game.spawnRemaining, game.day, 2) * (COLS - 2); y = 0.5; }
    else if (edge === 1) { x = COLS - 0.5; y = 1 + hash(game.spawnRemaining, game.day, 3) * (ROWS - 2); }
    else if (edge === 2) { x = 1 + hash(game.spawnRemaining, game.day, 4) * (COLS - 2); y = ROWS - 0.5; }
    else { x = 0.5; y = 1 + hash(game.spawnRemaining, game.day, 5) * (ROWS - 2); }

    const roll = hash(game.spawnRemaining, game.day, 71);
    const type = game.day >= 4 && roll < 0.17 ? "spitter" : game.day >= 3 && roll < 0.42 ? "brute" : "crawler";
    const stats = type === "brute"
      ? { health: 105, speed: 0.67, damage: 17 }
      : type === "spitter"
        ? { health: 56, speed: 0.93, damage: 11 }
        : { health: 38, speed: 1.12, damage: 8 };

    game.enemies.push({
      id: nextId++,
      type,
      x,
      y,
      health: stats.health + game.day * 3,
      maxHealth: stats.health + game.day * 3,
      speed: stats.speed,
      damage: stats.damage,
      attackTimer: 0,
      phase: hash(game.spawnRemaining, game.day, 99) * Math.PI * 2,
    });
  }

  function buildingAt(x, y, includeBlueprints = true) {
    return game.buildings.find((building) => {
      if (!includeBlueprints && !building.built) return false;
      return cellsForBuilding(building).some((cell) => cell.x === x && cell.y === y);
    });
  }

  function buildingTouchesType(building, type) {
    const occupied = cellsForBuilding(building);
    return game.buildings.some((other) => {
      if (other === building || other.type !== type || !other.built || other.health <= 0) return false;
      const otherCells = cellsForBuilding(other);
      return occupied.some((cell) => otherCells.some((candidate) => Math.abs(cell.x - candidate.x) + Math.abs(cell.y - candidate.y) === 1));
    });
  }

  function farmMultiplier(building) {
    const riverFed = cellsForBuilding(building).some((cell) => {
      for (let y = cell.y - 1; y <= cell.y + 1; y += 1) {
        for (let x = cell.x - 1; x <= cell.x + 1; x += 1) if (tileAt(x, y)?.type === "water") return true;
      }
      return false;
    });
    return riverFed ? 1.6 : 1;
  }

  function updateEnemies(dt) {
    if (game.phase === "night" && game.spawnRemaining > 0) {
      game.spawnTimer -= dt;
      if (game.spawnTimer <= 0) {
        spawnEnemy();
        game.spawnRemaining -= 1;
        game.spawnTimer = Math.max(1.25, 3.5 - game.day * 0.22);
      }
    }

    const center = heartCenter();
    game.enemies.forEach((enemy) => {
      enemy.attackTimer = Math.max(0, enemy.attackTimer - dt);
      const warded = game.wards.some((ward) => Math.hypot(enemy.x - ward.x, enemy.y - ward.y) <= ward.radius);
      if (warded) enemy.health -= dt * 2;

      const nearbySettler = nearest(game.settlers, enemy, (settler) => distance(enemy, settler) < 0.75);
      if (nearbySettler) {
        if (enemy.attackTimer <= 0) {
          nearbySettler.health -= enemy.damage;
          enemy.attackTimer = 1.1;
          game.effects.push({ type: "hit", x: nearbySettler.x, y: nearbySettler.y, life: 0.35, maxLife: 0.35 });
        }
        return;
      }

      if (distance(enemy, center) < 1.2) {
        if (enemy.attackTimer <= 0) {
          game.heart.health -= enemy.damage;
          enemy.attackTimer = 0.95;
          game.effects.push({ type: "hit", x: center.x, y: center.y, life: 0.35, maxLife: 0.35 });
        }
        return;
      }

      const dx = center.x - enemy.x;
      const dy = center.y - enemy.y;
      const length = Math.max(0.001, Math.hypot(dx, dy));
      const moveSpeed = enemy.speed * (warded ? 0.34 : 1);
      const next = { x: enemy.x + (dx / length) * moveSpeed * dt, y: enemy.y + (dy / length) * moveSpeed * dt };
      const blocker = buildingAt(Math.floor(next.x), Math.floor(next.y), false);
      if (blocker && blocker.type !== "heart") {
        if (enemy.attackTimer <= 0) {
          blocker.health -= enemy.damage;
          enemy.attackTimer = 1.05;
          game.effects.push({ type: "hit", x: blocker.x + blocker.width / 2, y: blocker.y + blocker.height / 2, life: 0.35, maxLife: 0.35 });
        }
      } else {
        enemy.x = next.x;
        enemy.y = next.y;
      }
    });

    const destroyed = game.buildings.filter((building) => building.type !== "heart" && building.health <= 0);
    destroyed.forEach((building) => addLog(`The blight destroyed a ${BUILDING_TYPES[building.type].label}.`, "BREACH"));
    game.buildings = game.buildings.filter((building) => building.type === "heart" || building.health > 0);

    const slain = game.enemies.filter((enemy) => enemy.health <= 0);
    if (slain.length) {
      game.kills += slain.length;
      game.resources.spirit = Math.min(100, game.resources.spirit + slain.length * 1.8);
    }
    game.enemies = game.enemies.filter((enemy) => enemy.health > 0);
    if (game.heart.health <= 0) endExpedition(false);
  }

  function updateTowers(dt) {
    game.buildings.forEach((building) => {
      if (building.type !== "tower" || !building.built || building.health <= 0) return;
      building.cooldown = Math.max(0, (building.cooldown || 0) - dt);
      if (building.cooldown > 0) return;
      const center = { x: building.x + building.width / 2, y: building.y + building.height / 2 };
      const range = buildingTouchesType(building, "wall") ? 10.5 : 8;
      const target = nearest(game.enemies, center, (enemy) => distance(enemy, center) <= range);
      if (!target) return;
      building.cooldown = 0.82;
      game.projectiles.push({ x: center.x, y: center.y - 0.3, target, speed: 9, damage: 19, life: 1.5 });
    });
  }

  function updateProjectiles(dt) {
    game.projectiles.forEach((projectile) => {
      projectile.life -= dt;
      if (!projectile.target || projectile.target.health <= 0) {
        projectile.life = 0;
        return;
      }
      if (moveToward(projectile, projectile.target, projectile.speed, dt)) {
        projectile.target.health -= projectile.damage;
        projectile.life = 0;
        game.effects.push({ type: "spark", x: projectile.target.x, y: projectile.target.y, life: 0.28, maxLife: 0.28 });
      }
    });
    game.projectiles = game.projectiles.filter((projectile) => projectile.life > 0);
  }

  function updateEffects(dt) {
    game.effects.forEach((effect) => { effect.life -= dt; });
    game.effects = game.effects.filter((effect) => effect.life > 0);
    game.wards.forEach((ward) => { ward.life -= dt; });
    game.wards = game.wards.filter((ward) => ward.life > 0);
  }

  function canPlace(type, x, y, rotation = buildingRotation) {
    const config = BUILDING_TYPES[type];
    if (!config) return false;
    const cells = footprintFor(type, rotation).map((cell) => ({ x: x + cell.x, y: y + cell.y }));
    for (const cell of cells) {
      if (cell.x < 1 || cell.y < 1 || cell.x >= COLS - 1 || cell.y >= ROWS - 1) return false;
      if (tileAt(cell.x, cell.y)?.type === "water") return false;
      if (buildingAt(cell.x, cell.y)) return false;
      if (game.nodes.some((node) => node.amount > 0 && node.x === cell.x && node.y === cell.y)) return false;
      if (game.shrines.some((shrine) => Math.abs(shrine.x - cell.x) < 2 && Math.abs(shrine.y - cell.y) < 2)) return false;
    }
    return true;
  }

  function placeBuilding(type, x, y) {
    const config = BUILDING_TYPES[type];
    if (!config) return;
    if (!canPlace(type, x, y, buildingRotation)) {
      toast("That ground is blocked.", "danger");
      return;
    }
    const cells = footprintFor(type, buildingRotation);
    const bounds = footprintBounds(cells);
    game.buildings.push({
      id: nextId++,
      type,
      x,
      y,
      width: bounds.width,
      height: bounds.height,
      rotation: buildingRotation,
      delivered: { wood: 0, stone: 0 },
      incoming: { wood: 0, stone: 0 },
      progress: 0,
      buildTime: config.buildTime,
      health: 1,
      maxHealth: config.maxHealth,
      built: false,
      notified: false,
    });
    addLog(`A ${config.label} was planned. Settlers will build it.`);
    toast(`${config.label} planned · builders must deliver materials`);
  }

  function castWard(x, y) {
    if (game.resources.spirit < 25) {
      toast("The Heartfire needs 25 Spirit.", "danger");
      return;
    }
    game.resources.spirit -= 25;
    game.wards.push({ x: x + 0.5, y: y + 0.5, radius: 3.2, life: 12, maxLife: 12 });
    let cleansed = false;
    game.shrines.forEach((shrine) => {
      if (!shrine.cleansed && Math.hypot(shrine.x - x, shrine.y - y) <= 2.2) {
        shrine.cleansed = true;
        cleansed = true;
        addLog("An ancient shrine answers the Heartfire and pushes back the dark.", "SHRINE CLEANSED");
      }
    });
    game.effects.push({ type: "ward", x: x + 0.5, y: y + 0.5, life: 0.7, maxLife: 0.7 });
    toast(cleansed ? "Ancient shrine cleansed" : "Protective ward raised");
  }

  function castFlare(x, y) {
    if (game.resources.spirit < 35) {
      toast("The Heartfire needs 35 Spirit.", "danger");
      return;
    }
    game.resources.spirit -= 35;
    let hits = 0;
    game.enemies.forEach((enemy) => {
      const range = Math.hypot(enemy.x - (x + 0.5), enemy.y - (y + 0.5));
      if (range <= 3.4) {
        enemy.health -= 62;
        hits += 1;
      }
    });
    game.effects.push({ type: "flare", x: x + 0.5, y: y + 0.5, life: 0.7, maxLife: 0.7 });
    toast(hits ? `Sunflare struck ${hits} ${hits === 1 ? "creature" : "creatures"}` : "Sunflare found only shadows");
  }

  function inspectAt(x, y) {
    const point = { x: x + 0.5, y: y + 0.5 };
    const settler = nearest(game.settlers, point, (item) => distance(item, point) < 0.9);
    if (settler) {
      game.selectedEntity = settler;
      ui.selectionTitle.textContent = "Selected settler";
      return;
    }
    const building = buildingAt(x, y);
    if (building) {
      game.selectedEntity = building;
      ui.selectionTitle.textContent = building.type === "heart" ? "Settlement pulse" : BUILDING_TYPES[building.type].label;
      return;
    }
    const node = nearest(game.nodes, point, (item) => item.amount > 0 && distance(item, point) < 0.9);
    if (node) {
      game.selectedEntity = node;
      ui.selectionTitle.textContent = node.type === "tree" ? "Pine stand" : node.type === "rock" ? "Stone outcrop" : "Berry thicket";
    }
  }

  function toggleHarvest(x, y) {
    const point = { x: x + 0.5, y: y + 0.5 };
    const nodes = game.nodes.filter((item) => item.amount > 0 && distance(item, point) < 2.6);
    if (!nodes.length) {
      toast("Select a tree, stone outcrop, or berry thicket.");
      return;
    }
    const mark = nodes.some((node) => !node.marked);
    nodes.forEach((node) => { node.marked = mark; });
    toast(mark ? `${nodes.length} resources marked for gathering` : "Gathering orders removed");
  }

  function canvasPoint(event) {
    const rect = canvas.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * canvas.width;
    const y = ((event.clientY - rect.top) / rect.height) * canvas.height;
    return { pixelX: x, pixelY: y, x: Math.floor(x / TILE), y: Math.floor(y / TILE) };
  }

  function handleWorldAction(event) {
    if (!game.started || game.ended || !ui.howToPanel.hidden) return;
    const point = canvasPoint(event);
    if (selectedTool === "inspect") inspectAt(point.x, point.y);
    else if (selectedTool === "harvest") toggleHarvest(point.x, point.y);
    else if (BUILDING_TYPES[selectedTool]) placeBuilding(selectedTool, point.x, point.y);
    else if (selectedTool === "ward") castWard(point.x, point.y);
    else if (selectedTool === "flare") castFlare(point.x, point.y);
  }

  function updateSimulation(dt) {
    updateCycle(dt);
    updateEconomy(dt);
    updateSettlers(dt);
    updateTowers(dt);
    updateEnemies(dt);
    updateProjectiles(dt);
    updateEffects(dt);
  }

  function drawTerrain() {
    const palettes = {
      grass: ["#294b37", "#2d5139", "#31563c", "#264432"],
      meadow: ["#365c3e", "#3a6241", "#32573b", "#3f6744"],
      moor: ["#273e37", "#2c443c", "#30483d", "#243a34"],
      path: ["#665a42", "#706349", "#5d523e", "#78694a"],
    };
    for (let y = 0; y < ROWS; y += 1) {
      for (let x = 0; x < COLS; x += 1) {
        const tile = game.tiles[y][x];
        const px = x * TILE;
        const py = y * TILE;
        if (tile.type === "water") {
          ctx.fillStyle = ["#23485a", "#285367", "#1f4254"][tile.variation % 3];
          ctx.fillRect(px, py, TILE, TILE);
          ctx.fillStyle = "rgba(121, 185, 190, 0.24)";
          ctx.fillRect(px + ((x + y) % 2) * 5, py + 5, 7, 1);
          ctx.fillRect(px + ((x + y + 1) % 2) * 6, py + 12, 6, 1);
        } else {
          ctx.fillStyle = palettes[tile.type][tile.variation];
          ctx.fillRect(px, py, TILE, TILE);
          const detail = hash(x, y, game.seed + 90);
          if (tile.type === "path" && detail > 0.45) {
            ctx.fillStyle = "rgba(39, 34, 27, 0.38)";
            ctx.fillRect(px + 3, py + 4, 3, 2);
            ctx.fillRect(px + 10, py + 11, 2, 2);
          } else if (detail > 0.69) {
            ctx.fillStyle = detail > 0.88 && tile.type === "meadow" ? "#7d8748" : "#203b2d";
            ctx.fillRect(px + 4, py + 7, 2, 3);
            ctx.fillRect(px + 11, py + 12, 2, 2);
          }
        }

        const edgeDistance = Math.min(x, COLS - 1 - x, y, ROWS - 1 - y);
        const blightDepth = 2.3 + Math.min(7.5, (game.day - 1) * 0.82);
        if (edgeDistance < blightDepth && tile.type !== "water") {
          const strength = Math.max(0, (blightDepth - edgeDistance) / blightDepth);
          ctx.fillStyle = `rgba(72, 35, 94, ${0.18 + strength * 0.42})`;
          ctx.fillRect(px, py, TILE, TILE);
          if (hash(x, y, game.day + 55) > 0.48) {
            ctx.fillStyle = "rgba(181, 85, 214, 0.46)";
            ctx.fillRect(px + 3, py + 4, 3, 3);
            ctx.fillRect(px + 11, py + 11, 2, 2);
          }
        }
      }
    }
  }

  function drawNode(node) {
    if (node.amount <= 0) return;
    const x = node.x * TILE;
    const y = node.y * TILE;
    if (node.marked) {
      ctx.strokeStyle = "rgba(255, 211, 122, 0.82)";
      ctx.lineWidth = 2;
      ctx.strokeRect(x + 2, y + 2, TILE - 4, TILE - 4);
    }
    if (node.type === "tree") {
      ctx.fillStyle = "#5f412d";
      ctx.fillRect(x + 10, y + 12, 5, 10);
      ctx.fillStyle = "#132b26";
      ctx.fillRect(x + 5, y + 7, 15, 10);
      ctx.fillStyle = "#1d3b2e";
      ctx.fillRect(x + 7, y + 3, 11, 8);
      ctx.fillStyle = "#3e5c3c";
      ctx.fillRect(x + 9, y + 4, 5, 3);
    } else if (node.type === "rock") {
      ctx.fillStyle = "#566566";
      ctx.fillRect(x + 5, y + 11, 15, 9);
      ctx.fillRect(x + 9, y + 7, 8, 5);
      ctx.fillStyle = "#81908c";
      ctx.fillRect(x + 9, y + 8, 6, 3);
      ctx.fillStyle = "#37474a";
      ctx.fillRect(x + 14, y + 15, 5, 5);
    } else {
      ctx.fillStyle = "#1b3c2d";
      ctx.fillRect(x + 4, y + 10, 17, 11);
      ctx.fillStyle = "#416b42";
      ctx.fillRect(x + 7, y + 7, 11, 8);
      ctx.fillStyle = "#c56a5b";
      ctx.fillRect(x + 8, y + 11, 3, 3);
      ctx.fillRect(x + 15, y + 8, 3, 3);
      ctx.fillRect(x + 16, y + 15, 2, 2);
    }
  }

  function drawShrine(shrine) {
    const x = shrine.x * TILE;
    const y = shrine.y * TILE;
    const pulse = Math.sin(performance.now() / 420 + shrine.id) * 2;
    ctx.fillStyle = shrine.cleansed ? "rgba(242, 173, 75, 0.12)" : "rgba(128, 58, 157, 0.14)";
    ctx.beginPath();
    ctx.arc(x + TILE / 2, y + TILE / 2, 21 + pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = shrine.cleansed ? "#6c603c" : "#352b45";
    ctx.fillRect(x + 2, y + 5, 12, 11);
    ctx.fillStyle = shrine.cleansed ? "#f2ad4b" : "#a35bc2";
    ctx.fillRect(x + 6, y + 1, 4, 13);
    ctx.fillRect(x + 4, y + 6, 8, 4);
    ctx.fillStyle = shrine.cleansed ? "#ffe5a0" : "#d89be9";
    ctx.fillRect(x + 7, y + 3, 2, 3);
  }

  function drawHeart(building) {
    const center = heartCenter();
    const x = center.x * TILE;
    const y = center.y * TILE;
    const flicker = Math.round(Math.sin(performance.now() / 95) * 2);
    ctx.fillStyle = "rgba(242, 173, 75, 0.16)";
    ctx.beginPath();
    ctx.arc(x, y, 92 + flicker * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#5f5548";
    for (let index = 0; index < 8; index += 1) {
      const angle = (Math.PI * 2 * index) / 8;
      ctx.fillRect(Math.round(x + Math.cos(angle) * 18) - 4, Math.round(y + Math.sin(angle) * 13) - 3, 8, 6);
    }
    ctx.fillStyle = "#8f4628";
    ctx.fillRect(x - 9, y - 4, 18, 11);
    ctx.fillStyle = "#e36f2f";
    ctx.fillRect(x - 7, y - 13 - flicker, 14, 17 + flicker);
    ctx.fillStyle = "#f5ad43";
    ctx.fillRect(x - 5, y - 18 + flicker, 10, 17 - flicker);
    ctx.fillStyle = "#ffe18b";
    ctx.fillRect(x - 3, y - 14, 6, 11);
  }

  function drawBuilding(building) {
    if (building.type === "heart") {
      drawHeart(building);
      return;
    }
    const x = building.x * TILE;
    const y = building.y * TILE;
    const width = building.width * TILE;
    const height = building.height * TILE;
    const cells = cellsForBuilding(building);

    if (!building.built) {
      cells.forEach((cell) => {
        ctx.fillStyle = "rgba(232, 214, 164, 0.16)";
        ctx.fillRect(cell.x * TILE + 1, cell.y * TILE + 1, TILE - 2, TILE - 2);
        ctx.strokeStyle = "rgba(241, 210, 138, 0.72)";
        ctx.lineWidth = 1;
        ctx.strokeRect(cell.x * TILE + 1.5, cell.y * TILE + 1.5, TILE - 3, TILE - 3);
      });
      ctx.fillStyle = "#0b1013";
      ctx.fillRect(x + 3, y + height - 7, width - 6, 4);
      ctx.fillStyle = "#f2ad4b";
      const config = BUILDING_TYPES[building.type];
      const materialTotal = Math.max(1, config.wood + config.stone);
      const deliveredTotal = building.delivered.wood + building.delivered.stone;
      const progress = materialsReady(building)
        ? 0.35 + 0.65 * Math.min(1, building.progress / building.buildTime)
        : 0.35 * Math.min(1, deliveredTotal / materialTotal);
      ctx.fillRect(x + 3, y + height - 7, (width - 6) * progress, 4);
      return;
    }

    cells.forEach((cell) => {
      ctx.fillStyle = building.type === "farm" ? "#543a29" : building.type === "wall" ? "#394446" : "#493a31";
      ctx.fillRect(cell.x * TILE + 1, cell.y * TILE + 2, TILE - 2, TILE - 3);
    });

    if (building.type === "hut") {
      cells.forEach((cell, index) => {
        const px = cell.x * TILE;
        const py = cell.y * TILE;
        ctx.fillStyle = index % 2 ? "#76513a" : "#835a3d";
        ctx.fillRect(px + 2, py + 6, TILE - 4, TILE - 7);
        ctx.fillStyle = "#2d3330";
        ctx.fillRect(px + 1, py + 2, TILE - 2, 6);
        if (index % 3 === 1) {
          ctx.fillStyle = "#f2ad4b";
          ctx.fillRect(px + 6, py + 9, 4, 4);
        }
      });
    } else if (building.type === "farm") {
      const riverFed = farmMultiplier(building) > 1;
      cells.forEach((cell, index) => {
        const px = cell.x * TILE;
        const py = cell.y * TILE;
        ctx.fillStyle = index % 2 ? "#6c5f32" : "#5f512e";
        ctx.fillRect(px + 2, py + 4, TILE - 4, 3);
        ctx.fillRect(px + 2, py + 11, TILE - 4, 3);
        ctx.fillStyle = riverFed ? "#b4ca63" : "#8fa447";
        ctx.fillRect(px + 5, py + 2, 2, 7);
        ctx.fillRect(px + 10, py + 8, 2, 7);
      });
    } else if (building.type === "storehouse") {
      cells.forEach((cell, index) => {
        const px = cell.x * TILE;
        const py = cell.y * TILE;
        ctx.fillStyle = index % 2 ? "#74513a" : "#825b3e";
        ctx.fillRect(px + 2, py + 5, TILE - 4, TILE - 6);
        ctx.fillStyle = "#2c3331";
        ctx.fillRect(px + 1, py + 2, TILE - 2, 5);
        ctx.fillStyle = "#c99a51";
        ctx.fillRect(px + 5, py + 9, 6, 3);
      });
    } else if (building.type === "wall") {
      cells.forEach((cell, index) => {
        const px = cell.x * TILE;
        const py = cell.y * TILE;
        ctx.fillStyle = "#657272";
        ctx.fillRect(px + 1, py + 4, TILE - 2, 11);
        ctx.fillStyle = "#8d9893";
        ctx.fillRect(px + 2 + (index % 2) * 4, py + 4, 7, 4);
        ctx.fillStyle = "#3c494a";
        ctx.fillRect(px + 1, py + 12, TILE - 2, 3);
      });
    } else if (building.type === "tower") {
      ctx.fillStyle = "#6e5038";
      ctx.fillRect(x + 5, y + 8, width - 10, height - 9);
      ctx.fillStyle = "#2d3331";
      ctx.fillRect(x + 2, y + 3, width - 4, 8);
      ctx.fillStyle = "#b47743";
      ctx.fillRect(x + 7, y + 12, 4, height - 14);
      ctx.fillRect(x + width - 11, y + 12, 4, height - 14);
      ctx.fillStyle = "#e4c077";
      ctx.fillRect(x + width / 2 - 2, y + 13, 4, 4);
      if (buildingTouchesType(building, "wall")) {
        ctx.fillStyle = "#f2ad4b";
        ctx.fillRect(x + width - 6, y + 4, 3, 3);
      }
    }

    if (building.health < building.maxHealth) {
      const ratio = Math.max(0, building.health / building.maxHealth);
      ctx.fillStyle = "rgba(5, 8, 10, 0.8)";
      ctx.fillRect(x + 3, y - 4, width - 6, 3);
      ctx.fillStyle = ratio > 0.45 ? "#83b66e" : "#d55d4b";
      ctx.fillRect(x + 3, y - 4, (width - 6) * ratio, 3);
    }
  }

  function drawSettler(settler) {
    const x = Math.round(settler.x * TILE);
    const y = Math.round(settler.y * TILE);
    const bob = Math.round(Math.sin(performance.now() / 170 + settler.id) * 1);
    ctx.fillStyle = "rgba(2, 5, 7, 0.35)";
    ctx.fillRect(x - 5, y + 6, 11, 4);
    ctx.fillStyle = "#d6b287";
    ctx.fillRect(x - 3, y - 7 + bob, 7, 6);
    ctx.fillStyle = settler.shirt;
    ctx.fillRect(x - 5, y - 1 + bob, 11, 9);
    ctx.fillStyle = "#283036";
    ctx.fillRect(x - 4, y + 8 + bob, 4, 4);
    ctx.fillRect(x + 2, y + 8 + bob, 4, 4);
    if (settler.carrying) {
      ctx.fillStyle = settler.carrying === "wood" ? "#9a663d" : settler.carrying === "stone" ? "#879391" : settler.carrying === "water" ? "#58a8c2" : "#c67849";
      ctx.fillRect(x + 6, y - 2, 6, 6);
    }
    if (settler.health < 100) {
      ctx.fillStyle = "#160707";
      ctx.fillRect(x - 6, y - 13, 12, 2);
      ctx.fillStyle = "#d55d4b";
      ctx.fillRect(x - 6, y - 13, 12 * (settler.health / 100), 2);
    }
  }

  function drawEnemy(enemy) {
    const x = Math.round(enemy.x * TILE);
    const y = Math.round(enemy.y * TILE);
    const bob = Math.round(Math.sin(performance.now() / 120 + enemy.phase) * 2);
    ctx.fillStyle = "rgba(4, 2, 8, 0.48)";
    ctx.fillRect(x - 7, y + 7, 15, 4);
    if (enemy.type === "brute") {
      ctx.fillStyle = "#26172f";
      ctx.fillRect(x - 9, y - 8 + bob, 19, 18);
      ctx.fillStyle = "#67357d";
      ctx.fillRect(x - 7, y - 5 + bob, 15, 10);
      ctx.fillStyle = "#e59aff";
      ctx.fillRect(x - 5, y - 2 + bob, 4, 3);
      ctx.fillRect(x + 3, y - 2 + bob, 4, 3);
    } else if (enemy.type === "spitter") {
      ctx.fillStyle = "#35173f";
      ctx.fillRect(x - 7, y - 6 + bob, 15, 14);
      ctx.fillStyle = "#9c4cb3";
      ctx.fillRect(x - 10, y - 2 + bob, 5, 4);
      ctx.fillRect(x + 6, y - 2 + bob, 5, 4);
      ctx.fillStyle = "#f1adff";
      ctx.fillRect(x - 4, y - 2 + bob, 3, 3);
      ctx.fillRect(x + 2, y - 2 + bob, 3, 3);
    } else {
      ctx.fillStyle = "#2b1735";
      ctx.fillRect(x - 6, y - 5 + bob, 13, 13);
      ctx.fillStyle = "#7c3f91";
      ctx.fillRect(x - 4, y - 3 + bob, 9, 7);
      ctx.fillStyle = "#e9a2ff";
      ctx.fillRect(x - 3, y - 1 + bob, 3, 2);
      ctx.fillRect(x + 2, y - 1 + bob, 3, 2);
    }
    if (enemy.health < enemy.maxHealth) {
      ctx.fillStyle = "#120716";
      ctx.fillRect(x - 8, y - 14, 16, 2);
      ctx.fillStyle = "#b764ca";
      ctx.fillRect(x - 8, y - 14, 16 * (enemy.health / enemy.maxHealth), 2);
    }
  }

  function drawEffects() {
    game.wards.forEach((ward) => {
      const alpha = 0.12 + 0.08 * Math.sin(performance.now() / 180);
      ctx.fillStyle = `rgba(91, 190, 176, ${alpha})`;
      ctx.strokeStyle = "rgba(137, 232, 209, 0.72)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(ward.x * TILE, ward.y * TILE, ward.radius * TILE, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    });

    game.projectiles.forEach((projectile) => {
      ctx.fillStyle = "#ffe5a0";
      ctx.fillRect(projectile.x * TILE - 2, projectile.y * TILE - 2, 5, 5);
    });

    game.effects.forEach((effect) => {
      const progress = 1 - effect.life / effect.maxLife;
      if (effect.type === "flare") {
        ctx.fillStyle = `rgba(255, 207, 105, ${0.48 * (1 - progress)})`;
        ctx.beginPath();
        ctx.arc(effect.x * TILE, effect.y * TILE, progress * 90, 0, Math.PI * 2);
        ctx.fill();
      } else if (effect.type === "ward") {
        ctx.strokeStyle = `rgba(125, 223, 205, ${1 - progress})`;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.arc(effect.x * TILE, effect.y * TILE, 18 + progress * 60, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        ctx.fillStyle = effect.type === "hit" ? `rgba(229, 102, 74, ${1 - progress})` : `rgba(255, 225, 139, ${1 - progress})`;
        ctx.fillRect(effect.x * TILE - 6 - progress * 5, effect.y * TILE - 6 - progress * 5, 12 + progress * 10, 12 + progress * 10);
      }
    });
  }

  function drawBuildGrid() {
    if (!BUILDING_TYPES[selectedTool] || !game.started || game.ended) return;
    ctx.strokeStyle = "rgba(220, 236, 218, 0.075)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= COLS; x += 1) {
      ctx.moveTo(x * TILE + 0.5, 0);
      ctx.lineTo(x * TILE + 0.5, canvas.height);
    }
    for (let y = 0; y <= ROWS; y += 1) {
      ctx.moveTo(0, y * TILE + 0.5);
      ctx.lineTo(canvas.width, y * TILE + 0.5);
    }
    ctx.stroke();
  }

  function drawPlacementGhost() {
    if (!hoveredTile || !game.started || game.ended) return;
    const x = hoveredTile.x;
    const y = hoveredTile.y;
    if (BUILDING_TYPES[selectedTool]) {
      const cells = footprintFor(selectedTool, buildingRotation);
      const allowed = canPlace(selectedTool, x, y, buildingRotation);
      ctx.fillStyle = allowed ? "rgba(126, 205, 150, 0.28)" : "rgba(218, 84, 69, 0.28)";
      ctx.strokeStyle = allowed ? "rgba(170, 235, 181, 0.9)" : "rgba(242, 115, 91, 0.9)";
      ctx.lineWidth = 1;
      cells.forEach((cell) => {
        ctx.fillRect((x + cell.x) * TILE, (y + cell.y) * TILE, TILE, TILE);
        ctx.strokeRect((x + cell.x) * TILE + 1, (y + cell.y) * TILE + 1, TILE - 2, TILE - 2);
      });
    } else if (selectedTool === "harvest") {
      ctx.strokeStyle = "rgba(255, 211, 122, 0.82)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc((x + 0.5) * TILE, (y + 0.5) * TILE, 2.6 * TILE, 0, Math.PI * 2);
      ctx.stroke();
    } else if (selectedTool === "ward" || selectedTool === "flare") {
      ctx.strokeStyle = selectedTool === "ward" ? "rgba(118, 224, 205, 0.8)" : "rgba(255, 209, 111, 0.82)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc((x + 0.5) * TILE, (y + 0.5) * TILE, 3.2 * TILE, 0, Math.PI * 2);
      ctx.stroke();
    }
  }

  function drawNightShade() {
    const phaseRatio = game.phaseTime / (game.phase === "day" ? DAY_LENGTH : NIGHT_LENGTH);
    let alpha;
    if (game.phase === "day") alpha = Math.max(0, (phaseRatio - 0.72) / 0.28) * 0.24;
    else alpha = 0.4 + Math.sin(Math.min(1, phaseRatio) * Math.PI) * 0.12;
    if (alpha <= 0) return;
    ctx.fillStyle = `rgba(8, 11, 29, ${alpha})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    drawHeart(game.heart);
  }

  function render() {
    drawTerrain();
    game.shrines.forEach(drawShrine);
    game.nodes.forEach(drawNode);
    game.buildings.forEach(drawBuilding);
    game.settlers.forEach(drawSettler);
    game.enemies.forEach(drawEnemy);
    drawNightShade();
    drawEffects();
    drawBuildGrid();
    drawPlacementGhost();
  }

  function entityJob(entity) {
    if (!entity) return "Watching the Heartfire";
    if (entity.type && entity.health !== undefined) {
      if (entity.type === "heart") return "The colony's last light";
      if (!entity.built) {
        const config = BUILDING_TYPES[entity.type];
        const wood = Math.max(0, config.wood - entity.delivered.wood - entity.incoming.wood);
        const stone = Math.max(0, config.stone - entity.delivered.stone - entity.incoming.stone);
        if (wood || stone) return `Waiting for ${wood ? `${wood} wood` : ""}${wood && stone ? " · " : ""}${stone ? `${stone} stone` : ""}`;
        return `${Math.round((entity.progress / entity.buildTime) * 100)}% constructed`;
      }
      const bonus = entity.type === "farm" && farmMultiplier(entity) > 1
        ? " · RIVER-FED +60%"
        : entity.type === "tower" && buildingTouchesType(entity, "wall")
          ? " · FORTIFIED RANGE"
          : "";
      return `${Math.ceil(entity.health)} / ${entity.maxHealth} integrity${bonus}`;
    }
    if (entity.amount !== undefined) return `${entity.amount} resources remain`;
    if (!entity.task) return "Choosing useful work";
    return {
      build: "Constructing a blueprint",
      supply: `Delivering ${entity.carrying || "materials"}`,
      repair: "Repairing damage from the blight",
      harvest: entity.task.stage === "return" ? `Carrying ${entity.carrying}` : "Gathering resources",
      water: entity.task.stage === "return" ? "Carrying water home" : "Fetching water",
      farm: entity.task.stage === "return" ? "Carrying the harvest" : "Tending crops",
      eat: "Eating at the Heartfire",
      drink: "Getting a drink",
      shelter: "Sheltering near the Heartfire",
      wander: "Waiting for an order",
    }[entity.task.kind] || "Working";
  }

  function updateSelectionUI() {
    const entity = game.selectedEntity || game.settlers[0] || game.heart;
    if (entity.name) {
      ui.needMeters.hidden = false;
      ui.settlerName.textContent = entity.name;
      ui.settlerJob.textContent = `${entity.role.toUpperCase()} · ${entityJob(entity)}`;
      ui.settlerMood.textContent = entity.health < 35 ? "WOUNDED" : entity.thirst < 35 ? "THIRSTY" : entity.hunger < 35 ? "HUNGRY" : entity.trait.toUpperCase();
      ui.hungerBar.style.width = `${entity.hunger}%`;
      ui.thirstBar.style.width = `${entity.thirst}%`;
    } else if (entity.type && entity.health !== undefined) {
      ui.needMeters.hidden = true;
      ui.settlerName.textContent = entity.type === "heart" ? "Heartfire" : BUILDING_TYPES[entity.type].label;
      ui.settlerJob.textContent = entityJob(entity);
      ui.settlerMood.textContent = entity.health / entity.maxHealth < 0.4 ? "DAMAGED" : entity.built ? "READY" : "BUILDING";
    } else {
      ui.needMeters.hidden = true;
      ui.settlerName.textContent = entity.type === "tree" ? "Pine stand" : entity.type === "rock" ? "Stone outcrop" : "Berry thicket";
      ui.settlerJob.textContent = entityJob(entity);
      ui.settlerMood.textContent = entity.marked ? "MARKED" : "UNMARKED";
    }
  }

  function updateUI() {
    const resources = game.resources;
    ui.food.textContent = Math.floor(resources.food);
    ui.wood.textContent = Math.floor(resources.wood);
    ui.stone.textContent = Math.floor(resources.stone);
    ui.water.textContent = Math.floor(resources.water);
    ui.spirit.textContent = Math.floor(resources.spirit);
    ui.population.textContent = game.settlers.length;
    ui.capacity.textContent = capacity();
    const assignedWorkers = Object.values(game.workforce).reduce((total, value) => total + value, 0);
    ui.buildersCount.textContent = game.workforce.builders;
    ui.gatherersCount.textContent = game.workforce.gatherers;
    ui.farmersCount.textContent = game.workforce.farmers;
    ui.idleWorkers.textContent = `${Math.max(0, game.settlers.length - assignedWorkers)} idle`;
    ui.storageValue.textContent = storageCapacity();

    const duration = game.phase === "day" ? DAY_LENGTH : NIGHT_LENGTH;
    const remaining = Math.max(0, Math.ceil(duration - game.phaseTime));
    const minutes = Math.floor(remaining / 60);
    const seconds = String(remaining % 60).padStart(2, "0");
    const progress = Math.min(100, (game.phaseTime / duration) * 100);
    const timeBand = game.phase === "night" ? "NIGHT" : progress < 36 ? "MORNING" : progress < 72 ? "AFTERNOON" : "DUSK";
    ui.phaseLabel.textContent = `${game.phase === "night" ? "NIGHT" : "DAY"} ${game.day} · ${timeBand}`;
    ui.cycleTimer.textContent = `${minutes}:${seconds}`;
    ui.cycleProgress.style.width = `${progress}%`;
    ui.cycleTrack.setAttribute("aria-valuenow", String(Math.round(progress)));
    ui.phaseHint.textContent = game.phase === "night"
      ? `${game.spawnRemaining + game.enemies.length} threats remain in the dark.`
      : progress > 75 ? "Dusk approaches. Finish the defenses." : "Gather, build, and prepare while it is safe.";

    const threatLevel = Math.min(5, 1 + Math.floor((game.day - 1) / 1.25));
    ui.threatPips.forEach((pip, index) => pip.classList.toggle("is-lit", index < threatLevel));
    ui.threatValue.textContent = ["LOW", "LOW", "RISING", "HIGH", "SEVERE", "DIRE"][threatLevel];
    ui.threatValue.style.color = threatLevel >= 4 ? "var(--danger)" : threatLevel >= 2 ? "var(--amber)" : "var(--green)";

    const heartRatio = Math.max(0, game.heart.health / game.heart.maxHealth);
    ui.heartHealthValue.textContent = `${Math.ceil(Math.max(0, game.heart.health))} / ${game.heart.maxHealth}`;
    ui.heartHealthBar.style.width = `${heartRatio * 100}%`;
    ui.heartHealthBar.style.background = heartRatio < 0.35 ? "var(--danger)" : "var(--green)";
    ui.housingStat.textContent = `${game.settlers.length} / ${capacity()}`;
    ui.foodDaysStat.textContent = game.settlers.length ? (game.resources.food / (game.settlers.length * 2.2)).toFixed(1) : "0";
    ui.defenseStat.textContent = game.buildings.filter((building) => building.built && (building.type === "wall" || building.type === "tower")).length;
    ui.killsStat.textContent = game.kills;

    const cleansed = game.shrines.filter((shrine) => shrine.cleansed).length;
    ui.shrineObjective.textContent = cleansed;
    ui.shrineObjective.classList.toggle("is-done", cleansed >= 3);
    ui.nightObjective.textContent = Math.min(6, game.nightsSurvived);
    ui.nightObjective.classList.toggle("is-done", game.nightsSurvived >= 6);

    ui.toolButtons.forEach((button) => {
      const tool = button.dataset.tool;
      let disabled = false;
      if (tool === "ward") disabled = resources.spirit < 25;
      else if (tool === "flare") disabled = resources.spirit < 35;
      button.disabled = disabled;
    });

    updateSelectionUI();
  }

  function frame(now) {
    const elapsed = Math.min(0.08, (now - lastFrame) / 1000);
    lastFrame = now;
    if (game.started && !game.paused && !game.ended) updateSimulation(elapsed * game.speed);
    render();
    updateUI();
    requestAnimationFrame(frame);
  }

  ui.newGameButton.addEventListener("click", () => {
    resetStartCopy();
    startExpedition();
  });
  ui.howToPlayButton.addEventListener("click", () => { ui.howToPanel.hidden = false; });
  ui.closeHowTo.addEventListener("click", () => { ui.howToPanel.hidden = true; });
  ui.pauseButton.addEventListener("click", () => setPaused(!game.paused));
  ui.speedButtons.forEach((button) => button.addEventListener("click", () => setSpeed(Number(button.dataset.speed))));
  ui.toolButtons.forEach((button) => button.addEventListener("click", () => setTool(button.dataset.tool)));
  if (ui.rotateButton) ui.rotateButton.addEventListener("click", rotateBuilding);
  ui.jobButtons.forEach((button) => button.addEventListener("click", () => changeWorkforce(button.dataset.job, Number(button.dataset.delta))));
  ui.clearLogButton.addEventListener("click", () => ui.eventLog.replaceChildren());

  canvas.addEventListener("pointermove", (event) => {
    const point = canvasPoint(event);
    hoveredTile = { x: point.x, y: point.y };
    ui.cursorLabel.hidden = false;
    ui.cursorLabel.style.left = `${event.offsetX}px`;
    ui.cursorLabel.style.top = `${event.offsetY}px`;
  });
  canvas.addEventListener("pointerleave", () => {
    hoveredTile = null;
    ui.cursorLabel.hidden = true;
  });
  canvas.addEventListener("pointerdown", handleWorldAction);
  canvas.addEventListener("contextmenu", (event) => {
    event.preventDefault();
    if (BUILDING_TYPES[selectedTool]) rotateBuilding();
    else setTool("inspect");
  });

  window.addEventListener("keydown", (event) => {
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
    if (event.code === "Space") {
      event.preventDefault();
      setPaused(!game.paused);
      return;
    }
    if (event.key === "Escape") {
      ui.howToPanel.hidden = true;
      setTool("inspect");
      return;
    }
    if (event.key.toLowerCase() === "r" && BUILDING_TYPES[selectedTool]) {
      rotateBuilding();
      return;
    }
    const button = ui.toolButtons.find((item) => item.dataset.key === event.key && !item.disabled);
    if (button) setTool(button.dataset.tool);
  });

  makeGame();
  updateUI();
  requestAnimationFrame(frame);
})();
